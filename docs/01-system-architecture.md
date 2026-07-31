# AI Study Assistant — System Architecture

**Document:** 01 — System Architecture

**Project:** AI Study Assistant

**Status:** Draft

**Version:** 1.0

**Last Updated:** 2026-07-31

---

## 1. Overview

AI Study Assistant is an AI-powered learning platform that allows students to upload study materials, organize them into workspaces, and interact with their documents using natural language.

The system uses Retrieval-Augmented Generation (RAG) to retrieve relevant information from a user's study materials before generating an answer with a Large Language Model (LLM).

The primary goal is to provide students with an AI study companion that answers questions based on their own learning materials rather than relying only on the model's general knowledge.

The initial version will focus on:

- User authentication
- Study workspaces
- PDF document management
- Document text extraction
- Document chunking
- Vector embeddings
- Semantic search
- RAG-based question answering
- AI-generated responses
- Source references
- Conversation history

Future versions may add:

- AI-generated summaries
- Quiz generation
- Flashcards
- Study progress tracking
- Amharic language support
- Additional document formats

---

# 2. System Goals

The system is designed around the following goals.

### 2.1 Reliable AI Answers

The AI should primarily use information retrieved from the user's uploaded study materials when answering document-related questions.

### 2.2 Clear Source Attribution

Whenever possible, AI responses should provide references to the documents and relevant sections used to generate the answer.

### 2.3 Secure User Data

Users must only be able to access their own:

- Workspaces
- Documents
- Conversations
- Messages

### 2.4 Maintainable Architecture

The system should use clear separation of responsibilities so that individual components can be developed, tested, and modified independently.

### 2.5 Production Readiness

The application should be designed with:

- Authentication
- Authorization
- Input validation
- Error handling
- Logging
- Testing
- Environment-based configuration
- Containerization

in mind from the beginning.

---

# 3. High-Level Architecture

The system follows a client-server architecture with a React frontend communicating with a Node.js backend through a versioned REST API.

The backend manages authentication, business logic, document processing, RAG orchestration, and communication with external AI services.

PostgreSQL is used as the primary database. The `pgvector` extension is used to store and search vector embeddings.

The initial architecture is:

```text
┌──────────────────────────────┐
│          User                │
│       Web Browser            │
└──────────────┬───────────────┘
               │
               │ HTTPS
               ▼
┌──────────────────────────────┐
│         Frontend             │
│                              │
│ React + TypeScript           │
│ Vite                         │
│ Tailwind CSS                 │
│ shadcn/ui                    │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│          Backend             │
│                              │
│ Node.js                      │
│ Express                      │
│ TypeScript                   │
│                              │
│ ┌──────────────────────────┐ │
│ │ Authentication           │ │
│ │ Workspace Management     │ │
│ │ Document Management      │ │
│ │ Chat Management          │ │
│ │ RAG Orchestration        │ │
│ └──────────────────────────┘ │
└──────────────┬───────────────┘
               │
       ┌───────┼────────┬───────────────┐
       │       │        │               │
       ▼       ▼        ▼               ▼
┌──────────┐ ┌───────┐ ┌────────────┐ ┌──────────┐
│PostgreSQL│ │ Files │ │ Embedding  │ │ Groq API │
│          │ │       │ │ Provider   │ │          │
│Relational│ │ PDFs  │ │            │ │ LLM      │
│Data      │ │       │ │            │ │          │
│          │ │       │ │            │ │          │
│pgvector  │ │       │ │            │ │          │
│Vectors   │ │       │ │            │ │          │
└──────────┘ └───────┘ └────────────┘ └──────────┘
```

---

# 4. Architectural Components

## 4.1 Frontend

The frontend is responsible for the user interface and user interactions.

### Technologies

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Responsibilities

The frontend will:

- Display authentication pages
- Manage user sessions
- Display workspaces
- Upload documents
- Display document processing status
- Display conversations
- Send user questions
- Stream or display AI responses
- Display source references
- Manage user settings

The frontend will not directly communicate with the database or Groq API.

All protected operations will go through the backend API.

---

## 4.2 Backend

The backend is the central application layer.

### Technologies

- Node.js
- Express
- TypeScript

### Responsibilities

The backend will:

- Authenticate users
- Authorize requests
- Validate incoming data
- Manage users
- Manage workspaces
- Manage documents
- Process uploaded documents
- Generate and store embeddings
- Perform vector similarity searches
- Build RAG prompts
- Communicate with the Groq API
- Store conversations and messages
- Return AI responses and sources
- Handle application errors
- Provide structured logging

The backend will follow a modular architecture to keep domain responsibilities separated.

A proposed internal structure is:

```text
backend/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── workspaces/
│   │   ├── documents/
│   │   ├── conversations/
│   │   └── ai/
│   │
│   ├── middleware/
│   ├── database/
│   ├── services/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── tests/
├── package.json
└── tsconfig.json
```

The exact backend architecture will be finalized during the API and implementation phases.

---

# 5. Database

PostgreSQL will be the primary database.

It will store:

- Users
- Refresh tokens
- Workspaces
- Documents
- Document metadata
- Document chunks
- Vector embeddings
- Conversations
- Messages

The `pgvector` PostgreSQL extension will be used for vector similarity search.

The initial database architecture is:

```text
PostgreSQL
│
├── Relational Data
│   ├── users
│   ├── refresh_tokens
│   ├── workspaces
│   ├── documents
│   ├── conversations
│   └── messages
│
└── Vector Data
    └── document_chunks
         └── embedding
```

Using PostgreSQL for both relational and vector data reduces infrastructure complexity during the initial stages.

A dedicated vector database may be evaluated later if the system grows beyond the capabilities or performance requirements of PostgreSQL + pgvector.

---

# 6. File Storage

Uploaded documents must be stored separately from their metadata.

The database will store document metadata such as:

- Original filename
- MIME type
- File size
- Storage location
- Processing status
- Upload timestamp

The actual PDF file will be stored in a file storage system.

For local development, the initial implementation may use local filesystem storage.

For production, the application should use an object storage service compatible with the S3 API.

The architecture will therefore separate:

```text
Document Metadata
        │
        ▼
PostgreSQL

Document Binary File
        │
        ▼
File/Object Storage
```

This prevents large binary files from unnecessarily increasing the size of the relational database.

---

# 7. AI and RAG Architecture

The AI system uses a Retrieval-Augmented Generation pipeline.

The system does not send the entire document collection to the LLM.

Instead, it retrieves only the most relevant document chunks.

The pipeline is:

```text
User Question
      │
      ▼
Generate Query Embedding
      │
      ▼
Vector Similarity Search
      │
      ▼
Retrieve Relevant Chunks
      │
      ▼
Build Context
      │
      ▼
Construct Prompt
      │
      ▼
Send Request to LLM
      │
      ▼
Generate Answer
      │
      ▼
Attach Source References
      │
      ▼
Return Response
```

The purpose of RAG is to improve answer relevance and reduce hallucination by grounding the model's response in the user's study materials.

---

# 8. Document Ingestion Pipeline

When a user uploads a document, the document goes through an ingestion pipeline.

```text
PDF Upload
    │
    ▼
Validate File
    │
    ├── Invalid ──► Reject
    │
    ▼
Store Original File
    │
    ▼
Create Document Record
    │
    ▼
Extract Text
    │
    ▼
Clean Text
    │
    ▼
Split Text into Chunks
    │
    ▼
Generate Embeddings
    │
    ▼
Store Chunks + Embeddings
    │
    ▼
Mark Document as READY
```

If an error occurs:

```text
Processing Error
      │
      ▼
Mark Document as FAILED
      │
      ▼
Store Error Information
```

The document processing system should be designed so that processing can later be moved to asynchronous background jobs without requiring major changes to the rest of the application.

---

# 9. Chat and RAG Request Flow

When a user asks a question:

```text
User
 │
 │ "Explain supervised learning"
 ▼
Frontend
 │
 │ POST /api/v1/conversations/:id/messages
 ▼
Backend
 │
 ├── Authenticate User
 │
 ├── Authorize Workspace Access
 │
 ├── Save User Message
 │
 ├── Generate Query Embedding
 │
 ├── Search Relevant Document Chunks
 │
 ├── Build Context
 │
 ├── Build Prompt
 │
 ├── Call Groq API
 │
 ├── Save AI Response
 │
 └── Attach Sources
 │
 ▼
Frontend
 │
 ▼
Display Answer + Sources
```

The backend is responsible for controlling access to documents and ensuring that retrieval is limited to documents the authenticated user is authorized to access.

---

# 10. Authentication Architecture

The application will use token-based authentication.

The initial authentication architecture will consist of:

```text
User
 │
 ▼
Register
 │
 ▼
Hash Password
 │
 ▼
Store User
 │
 ▼
Login
 │
 ▼
Verify Password
 │
 ▼
Issue Access Token
 │
 ▼
Issue Refresh Token
```

Protected requests will include a valid access token.

The backend will verify the token before allowing access to protected resources.

Authorization will be enforced at the resource level.

For example:

```text
User A
  │
  ├── Workspace A ✓
  │
  └── Workspace B ✗
```

A user must never be able to access another user's workspace, document, conversation, or message by modifying an ID in an API request.

---

# 11. Security Architecture

Security is considered a core system requirement.

The system will implement:

- Password hashing
- JWT authentication
- Refresh token rotation
- Input validation
- Request authorization
- File type validation
- File size limits
- Rate limiting
- CORS configuration
- Secure HTTP headers
- Environment variables for secrets
- SQL injection protection through parameterized queries or ORM/database libraries
- Protection against unauthorized resource access
- Secure error responses

Sensitive information must never be committed to Git.

Examples include:

```text
.env
API keys
JWT secrets
Database passwords
Production credentials
```

The repository will contain:

```text
.env.example
```

with placeholder values only.

---

# 12. API Architecture

The backend API will use versioned REST endpoints.

The base API path will be:

```text
/api/v1
```

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/workspaces
/api/v1/documents
/api/v1/conversations
/api/v1/ai
```

API responses will follow a consistent structure.

Example success response:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

Example error response:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found"
  }
}
```

The complete API contract will be defined in:

```text
docs/04-api-design.md
```

---

# 13. Initial Deployment Architecture

The production system is expected to run in containers.

Initial deployment architecture:

```text
                    Internet
                       │
                       ▼
                  HTTPS / TLS
                       │
                       ▼
                    Nginx
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
         Frontend             Backend
         Container            Container
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
                  ▼              ▼              ▼
             PostgreSQL      File Storage     Groq API
             + pgvector
```

Docker will be used to provide consistent development and deployment environments.

The exact production infrastructure will be decided during the deployment phase.

---

# 14. Scalability Considerations

The initial system is designed as a modular monolith.

This means that the application will have a single backend deployment but internally separated modules.

```text
Backend
│
├── Auth Module
├── User Module
├── Workspace Module
├── Document Module
├── Conversation Module
└── AI Module
```

This approach is preferred for the initial version because:

- It is easier to develop
- It is easier to deploy
- It reduces infrastructure complexity
- It allows clear separation of responsibilities
- It can later be split into services if necessary

Potential future scaling improvements include:

- Background job processing
- Redis caching
- Message queues
- Dedicated vector databases
- Separate document processing workers
- Horizontal backend scaling
- CDN for frontend assets
- Object storage
- Observability and centralized logging

These components will only be introduced when actual requirements justify them.

---

# 15. Architectural Principles

The project will follow these principles.

### Separation of Concerns

Each module should have a clear responsibility.

### Least Privilege

Users should only access resources they are authorized to access.

### Secure by Default

Security controls should be implemented from the beginning rather than added after development.

### API First

The backend API should have a clear contract before the frontend depends on it.

### Database Integrity

Relationships, constraints, and indexes should be explicitly designed.

### Stateless Backend

The backend should avoid storing authentication state in server memory so that multiple backend instances can eventually run independently.

### Observable System

Important operations and failures should be logged to make debugging and monitoring possible.

### Incremental Complexity

The architecture should remain as simple as possible while supporting current requirements.

Complex infrastructure should be introduced only when justified by actual needs.

---

# 16. Architectural Decisions

The following decisions have been made for the initial system.

| Decision         | Choice                                        | Reason                                         |
| ---------------- | --------------------------------------------- | ---------------------------------------------- |
| Frontend         | React + TypeScript                            | Strong ecosystem and type safety               |
| Frontend Tooling | Vite                                          | Fast development and build tooling             |
| Backend          | Node.js + Express + TypeScript                | Familiar, flexible, and suitable for REST APIs |
| Primary Database | PostgreSQL                                    | Reliable relational database                   |
| Vector Storage   | pgvector                                      | Avoids unnecessary additional infrastructure   |
| API Style        | Versioned REST                                | Simple and well understood                     |
| Architecture     | Modular Monolith                              | Easier to develop and deploy initially         |
| AI Provider      | Groq API                                      | Fast inference and accessible API              |
| File Storage     | Local development + Object Storage production | Separates binary data from metadata            |
| Containerization | Docker                                        | Consistent environments                        |
| Reverse Proxy    | Nginx                                         | TLS termination and routing                    |
| Authentication   | Access + Refresh Tokens                       | Secure and scalable session model              |

---

# 17. Future Architecture Evolution

The system should evolve based on real requirements.

Potential evolution:

```text
                   Initial System

              Modular Monolith
                     │
                     ▼
             Add Background Jobs
                     │
                     ▼
               Add Redis
                     │
                     ▼
          Separate Document Worker
                     │
                     ▼
       Scale Backend Horizontally
                     │
                     ▼
     Evaluate Dedicated Vector Database
```

The project will not adopt microservices prematurely.

Architecture changes should be driven by:

- Performance requirements
- Increased traffic
- Data volume
- Deployment requirements
- Team size
- Operational complexity

---

# 18. Open Architectural Questions

The following decisions will be finalized during later phases:

1. Which PostgreSQL client or ORM should be used?
2. Which embedding model/provider should be used?
3. Which PDF extraction library should be used?
4. Which chunking strategy should be used?
5. What embedding dimensions will be stored?
6. What similarity search strategy should be used?
7. How many chunks should be retrieved per query?
8. How should source citations be represented?
9. Should AI responses use streaming?
10. Which object storage provider should be used in production?
11. Which deployment platform should be used?
12. How should background document processing be implemented?
13. What rate limits should be applied?
14. What observability and monitoring tools should be used?

These decisions will be documented as the relevant implementation phases are designed.

---

# 19. Document Status

This document represents the initial system architecture.

The architecture is intentionally designed to support the MVP while leaving room for future expansion.

The next documents will refine this architecture:

```text
01-system-architecture.md
        │
        ▼
02-product-requirements.md
        │
        ▼
03-database-design.md
        │
        ▼
04-api-design.md
```

Changes to major architectural decisions should be documented and justified before implementation.
