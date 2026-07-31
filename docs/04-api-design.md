# AI Study Assistant — API Design

**Document:** 04 — API Design  
**Project:** AI Study Assistant  
**API Style:** REST  
**API Version:** v1  
**Backend:** Node.js + Express + TypeScript  
**ORM:** Drizzle ORM  
**Migration Tool:** Drizzle Kit  
**Database:** PostgreSQL + pgvector  
**Status:** Draft  
**Version:** 1.0  
**Last Updated:** 2026-07-31

---

# 1. Overview

The AI Study Assistant backend exposes a versioned REST API that provides access to authentication, users, workspaces, documents, conversations, and AI-powered study functionality.

The API acts as the primary interface between:

```text
React Frontend
      │
      │ HTTPS / REST
      ▼
Express Backend
      │
      ├── Authentication
      ├── Authorization
      ├── Business Logic
      ├── Document Processing
      ├── RAG Pipeline
      └── AI Integration
      │
      ├───────────────┐
      ▼               ▼
PostgreSQL        External AI APIs
+ pgvector        Groq + Embeddings
```

The frontend must never directly access:

* PostgreSQL
* Groq API
* Embedding provider
* Private document storage

All protected operations must pass through the backend.

---

# 2. API Base URL

The API will use the following base path:

```text
/api/v1
```

During local development:

```text
http://localhost:4000/api/v1
```

Example:

```text
GET /api/v1/workspaces
```

In production:

```text
https://api.example.com/api/v1/workspaces
```

The production domain will be determined during deployment.

---

# 3. API Design Principles

The API follows these principles:

### Versioned

All endpoints are prefixed with:

```text
/api/v1
```

### Resource-Oriented

Endpoints represent resources rather than actions.

Preferred:

```text
GET /workspaces
```

Instead of:

```text
GET /getAllWorkspaces
```

### Consistent Responses

Successful and failed requests follow predictable response structures.

### Secure by Default

Protected endpoints require authentication.

### Explicit Authorization

Authentication verifies who the user is.

Authorization verifies whether the user can access the requested resource.

### Validation

All incoming request data must be validated before reaching business logic.

### Clear Errors

Errors should return machine-readable error codes and human-readable messages.

---

# 4. Authentication

Authentication will use:

* Short-lived access tokens
* Long-lived refresh tokens

The architecture is:

```text
Login
  │
  ▼
Verify Credentials
  │
  ▼
Generate Access Token
  │
  ▼
Generate Refresh Token
  │
  ▼
Store Refresh Token Hash
  │
  ▼
Return Tokens
```

The access token will be used to authenticate API requests.

The refresh token will be used to obtain a new access token.

---

# 5. Authentication Strategy

## Access Token

The access token will be short-lived.

Example:

```text
Expiration: 15 minutes
```

The exact expiration can be changed through environment configuration.

The access token should contain:

```json
{
  "sub": "user-uuid",
  "type": "access"
}
```

The backend should not store access tokens in the database.

---

## Refresh Token

Refresh tokens will be stored securely.

The database will store:

```text
token_hash
```

rather than the raw refresh token.

Refresh tokens should support:

* Expiration
* Revocation
* Rotation

The exact refresh-token transport mechanism will be finalized during security implementation.

---

# 6. Authentication Endpoints

## POST /auth/register

Creates a new user account.

### Request

```json
{
  "name": "Dagm Yibabe",
  "email": "dagm@example.com",
  "password": "secure-password"
}
```

### Validation

* `name` is required.
* `email` must be valid.
* `email` must be unique.
* Password must meet minimum security requirements.

### Success

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dagm Yibabe",
      "email": "dagm@example.com"
    }
  },
  "message": "Account created successfully"
}
```

The response must never contain:

```text
password
password_hash
```

---

## POST /auth/login

Authenticates a user.

### Request

```json
{
  "email": "dagm@example.com",
  "password": "secure-password"
}
```

### Success

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dagm Yibabe",
      "email": "dagm@example.com"
    },
    "accessToken": "access-token",
    "refreshToken": "refresh-token"
  },
  "message": "Login successful"
}
```

The exact refresh-token delivery mechanism may later be changed to an HTTP-only cookie for improved security.

---

## POST /auth/refresh

Generates a new access token.

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Success

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token"
  },
  "message": "Token refreshed successfully"
}
```

The refresh token should be rotated according to the final security implementation.

---

## POST /auth/logout

Revokes the current refresh token.

### Authentication

Required.

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Success

**Status:** `204 No Content`

The refresh token becomes invalid.

---

# 7. User Endpoints

## GET /users/me

Returns the currently authenticated user's profile.

### Authentication

Required.

### Success

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dagm Yibabe",
      "email": "dagm@example.com",
      "createdAt": "2026-07-31T12:00:00Z"
    }
  }
}
```

---

## PATCH /users/me

Updates the current user's profile.

### Authentication

Required.

### Request

```json
{
  "name": "New Name"
}
```

### Success

**Status:** `200 OK`

Returns the updated user.

---

## PATCH /users/me/password

Changes the current user's password.

### Authentication

Required.

### Request

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

### Success

**Status:** `204 No Content`

The system should revoke existing refresh sessions after a successful password change.

---

# 8. Workspace Endpoints

Workspace routes are protected.

Every workspace request must verify ownership.

---

## GET /workspaces

Returns all workspaces owned by the authenticated user.

### Authentication

Required.

### Success

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "id": "uuid",
        "name": "Machine Learning",
        "createdAt": "2026-07-31T12:00:00Z",
        "updatedAt": "2026-07-31T12:00:00Z"
      }
    ]
  }
}
```

---

## POST /workspaces

Creates a workspace.

### Authentication

Required.

### Request

```json
{
  "name": "Machine Learning"
}
```

### Success

**Status:** `201 Created`

Returns the created workspace.

---

## GET /workspaces/:workspaceId

Returns a specific workspace.

### Authentication

Required.

### Authorization

The authenticated user must own the workspace.

### Success

**Status:** `200 OK`

---

## PATCH /workspaces/:workspaceId

Updates a workspace.

### Authentication

Required.

### Request

```json
{
  "name": "Advanced Machine Learning"
}
```

### Success

**Status:** `200 OK`

---

## DELETE /workspaces/:workspaceId

Deletes a workspace.

### Authentication

Required.

### Authorization

Only the workspace owner can delete it.

### Success

**Status:** `204 No Content`

The deletion must follow the database cascade rules.

Associated document files must also be removed from file storage.

---

# 9. Document Endpoints

Documents belong to workspaces.

The relationship is:

```text
User
  │
  ▼
Workspace
  │
  ▼
Document
```

Every document request must verify that the authenticated user owns the parent workspace.

---

## GET /workspaces/:workspaceId/documents

Returns documents belonging to a workspace.

### Authentication

Required.

### Success

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "Machine Learning Notes",
        "originalFilename": "ml-notes.pdf",
        "mimeType": "application/pdf",
        "fileSize": 5242880,
        "status": "READY",
        "createdAt": "2026-07-31T12:00:00Z"
      }
    ]
  }
}
```

---

## POST /workspaces/:workspaceId/documents

Uploads a PDF document.

### Authentication

Required.

### Content Type

```text
multipart/form-data
```

### Form Fields

```text
title
file
```

### Example

```text
title = Machine Learning Notes
file = ml-notes.pdf
```

### Validation

* File is required.
* File must be a PDF.
* File must not exceed the configured size limit.
* Workspace must belong to the authenticated user.

### Success

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "uuid",
      "title": "Machine Learning Notes",
      "status": "UPLOADED"
    }
  },
  "message": "Document uploaded successfully"
}
```

Document processing will occur after upload.

---

## GET /documents/:documentId

Returns document metadata.

### Authentication

Required.

### Authorization

The document must belong to a workspace owned by the authenticated user.

### Success

Returns document metadata.

---

## DELETE /documents/:documentId

Deletes a document.

### Authentication

Required.

### Authorization

The document must belong to the authenticated user's workspace.

### Success

**Status:** `204 No Content`

The backend must:

1. Remove the stored file.
2. Delete the database record.
3. Cascade delete document chunks.
4. Remove associated vector embeddings.
5. Remove source references.

---

## GET /documents/:documentId/status

Returns document processing status.

### Authentication

Required.

### Success

```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "status": "PROCESSING"
  }
}
```

Possible states:

```text
UPLOADED
PROCESSING
READY
FAILED
```

---

# 10. Conversation Endpoints

Conversations belong to workspaces.

---

## GET /workspaces/:workspaceId/conversations

Returns conversations in a workspace.

### Authentication

Required.

### Success

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Supervised Learning",
        "createdAt": "2026-07-31T12:00:00Z",
        "updatedAt": "2026-07-31T12:30:00Z"
      }
    ]
  }
}
```

Conversations should be ordered by:

```text
updated_at DESC
```

---

## POST /workspaces/:workspaceId/conversations

Creates a conversation.

### Authentication

Required.

### Request

```json
{
  "title": "Supervised Learning"
}
```

### Success

**Status:** `201 Created`

Returns the created conversation.

---

## GET /conversations/:conversationId

Returns conversation metadata.

### Authentication

Required.

### Authorization

The conversation must belong to a workspace owned by the authenticated user.

---

## DELETE /conversations/:conversationId

Deletes a conversation.

### Authentication

Required.

### Success

**Status:** `204 No Content`

Messages and source references will be deleted according to database cascade rules.

---

# 11. Message Endpoints

## GET /conversations/:conversationId/messages

Returns conversation messages.

### Authentication

Required.

### Success

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "role": "USER",
        "content": "What is supervised learning?",
        "createdAt": "2026-07-31T12:00:00Z"
      },
      {
        "id": "uuid",
        "role": "ASSISTANT",
        "content": "Supervised learning is...",
        "createdAt": "2026-07-31T12:00:05Z",
        "sources": [
          {
            "documentId": "uuid",
            "documentTitle": "Machine Learning Notes",
            "pageNumber": 12,
            "relevanceScore": 0.91
          }
        ]
      }
    ]
  }
}
```

Messages should be returned chronologically.

---

# 12. AI Chat Endpoint

The AI chat endpoint is the primary feature of the application.

## POST /conversations/:conversationId/messages

Sends a question to the AI assistant.

### Authentication

Required.

### Request

```json
{
  "content": "Explain supervised learning in simple terms."
}
```

### Request Flow

```text
HTTP Request
     │
     ▼
Authenticate User
     │
     ▼
Validate Request
     │
     ▼
Verify Conversation Ownership
     │
     ▼
Save User Message
     │
     ▼
Generate Query Embedding
     │
     ▼
Search Relevant Document Chunks
     │
     ▼
Build RAG Context
     │
     ▼
Call Groq API
     │
     ▼
Receive AI Response
     │
     ▼
Save Assistant Message
     │
     ▼
Save Message Sources
     │
     ▼
Return Response
```

### Success

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "Supervised learning is a type of machine learning...",
      "createdAt": "2026-07-31T12:00:05Z"
    },
    "sources": [
      {
        "documentId": "uuid",
        "documentTitle": "Machine Learning Notes",
        "chunkId": "uuid",
        "pageNumber": 12,
        "relevanceScore": 0.91,
        "rank": 1
      }
    ]
  }
}
```

---

# 13. RAG Retrieval API Flow

The RAG process is internal to the backend.

The frontend does not directly call the vector database.

```text
Frontend
   │
   │ User Question
   ▼
POST /conversations/:id/messages
   │
   ▼
Backend
   │
   ├── Save User Message
   │
   ├── Generate Query Embedding
   │
   ├── Vector Search
   │
   ├── Retrieve Top K Chunks
   │
   ├── Build Prompt
   │
   ├── Call Groq
   │
   ├── Save AI Message
   │
   └── Save Sources
   │
   ▼
Frontend
```

The retrieval system must only search documents that belong to the current user's workspace.

---

# 14. AI Provider Integration

The backend will integrate with Groq through an internal service.

The architecture is:

```text
Chat Controller
      │
      ▼
AI Service
      │
      ├── Retrieve Context
      │
      ├── Build Prompt
      │
      ▼
Groq Client
      │
      ▼
Groq API
```

The Groq API key must never be exposed to the frontend.

The frontend communicates only with:

```text
POST /conversations/:conversationId/messages
```

---

# 15. AI Prompt Architecture

The backend will construct prompts using:

```text
System Instructions
        +
Retrieved Context
        +
Conversation History
        +
Current User Question
```

Conceptually:

```text
┌────────────────────────────┐
│ System Instructions        │
├────────────────────────────┤
│ Retrieved Document Context │
├────────────────────────────┤
│ Previous Conversation      │
├────────────────────────────┤
│ Current Question           │
└────────────────────────────┘
              │
              ▼
          Groq LLM
              │
              ▼
        AI Response
```

The system prompt should instruct the model to:

* Use retrieved context when answering document-related questions.
* Avoid inventing information.
* Clearly indicate when the provided context does not contain an answer.
* Provide useful explanations.
* Avoid claiming unsupported citations.

---

# 16. API Response Format

Successful responses should follow:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

The `message` field is optional for read operations.

Example:

```json
{
  "success": true,
  "data": {
    "workspace": {}
  }
}
```

---

# 17. Error Response Format

All API errors should follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The requested workspace was not found."
  }
}
```

Validation errors may include additional details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address."
      }
    ]
  }
}
```

---

# 18. Standard Error Codes

The initial error codes include:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
EMAIL_ALREADY_EXISTS
INVALID_CREDENTIALS
INVALID_REFRESH_TOKEN
TOKEN_EXPIRED
TOKEN_REVOKED
WORKSPACE_NOT_FOUND
DOCUMENT_NOT_FOUND
CONVERSATION_NOT_FOUND
FILE_TOO_LARGE
UNSUPPORTED_FILE_TYPE
DOCUMENT_PROCESSING_FAILED
AI_PROVIDER_ERROR
EMBEDDING_PROVIDER_ERROR
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

---

# 19. HTTP Status Codes

The API will use standard HTTP status codes.

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 200    | Successful request                       |
| 201    | Resource created                         |
| 204    | Successful request with no response body |
| 400    | Invalid request                          |
| 401    | Authentication required or invalid       |
| 403    | Authenticated but not authorized         |
| 404    | Resource not found                       |
| 409    | Resource conflict                        |
| 413    | File too large                           |
| 415    | Unsupported media type                   |
| 422    | Validation error                         |
| 429    | Rate limit exceeded                      |
| 500    | Internal server error                    |
| 502    | External service failure                 |

---

# 20. Authentication Header

Protected API requests will use:

```text
Authorization: Bearer <access-token>
```

Example:

```text
Authorization: Bearer eyJhbGciOi...
```

The authentication middleware will:

1. Extract the token.
2. Verify the token.
3. Validate expiration.
4. Extract the user ID.
5. Attach the authenticated user to the request context.

Conceptually:

```text
Request
  │
  ▼
Auth Middleware
  │
  ├── Invalid → 401
  │
  ▼
Authenticated User
  │
  ▼
Controller
```

---

# 21. Authorization

Authorization must be checked at the resource level.

Example:

```text
GET /documents/:documentId
```

The backend must verify:

```text
Authenticated User
       │
       ▼
Document
       │
       ▼
Workspace
       │
       ▼
Workspace Owner
```

The ownership chain must resolve to the authenticated user.

The API must never trust user-provided ownership identifiers.

For example, a request such as:

```json
{
  "userId": "another-user-id"
}
```

must not be used to determine ownership.

Ownership must be derived from the authenticated session and database relationships.

---

# 22. Pagination

List endpoints should support pagination.

Initial query parameters:

```text
?page=1&limit=20
```

Example:

```text
GET /workspaces/:workspaceId/conversations?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

Pagination limits must be enforced server-side.

For example:

```text
Maximum limit: 100
```

The exact pagination strategy may evolve to cursor-based pagination if the application requires it.

---

# 23. File Upload Limits

The initial document upload policy is:

```text
Allowed type:
application/pdf

Maximum size:
50 MB
```

The backend must validate:

* MIME type
* File extension
* Actual file content where practical
* File size

The application should not rely solely on the filename extension.

---

# 24. Rate Limiting

Rate limiting will be applied to sensitive endpoints.

Higher priority endpoints include:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /conversations/:conversationId/messages
```

AI requests should have stricter limits because they may consume external API resources.

The exact limits will be determined during implementation and deployment.

---

# 25. API Security

The API will implement:

* Authentication
* Authorization
* Input validation
* Rate limiting
* Secure HTTP headers
* CORS restrictions
* Request body size limits
* File upload validation
* Secret management
* Structured error handling

Sensitive internal errors must not be exposed to clients.

For example, the client should not receive:

```text
PostgreSQL connection string
Groq API key
Stack traces
Internal filesystem paths
```

Production errors should return safe messages while detailed information is logged internally.

---

# 26. API Route Summary

The initial API consists of:

```text
AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

USERS
GET    /users/me
PATCH  /users/me
PATCH  /users/me/password

WORKSPACES
GET    /workspaces
POST   /workspaces
GET    /workspaces/:workspaceId
PATCH  /workspaces/:workspaceId
DELETE /workspaces/:workspaceId

DOCUMENTS
GET    /workspaces/:workspaceId/documents
POST   /workspaces/:workspaceId/documents
GET    /documents/:documentId
GET    /documents/:documentId/status
DELETE /documents/:documentId

CONVERSATIONS
GET    /workspaces/:workspaceId/conversations
POST   /workspaces/:workspaceId/conversations
GET    /conversations/:conversationId
DELETE /conversations/:conversationId

MESSAGES
GET    /conversations/:conversationId/messages
POST   /conversations/:conversationId/messages
```

---

# 27. Backend Module Mapping

The API routes map to backend modules.

```text
backend/src/modules/

auth/
  ├── auth.controller.ts
  ├── auth.service.ts
  ├── auth.routes.ts
  └── auth.schema.ts

users/
  ├── users.controller.ts
  ├── users.service.ts
  ├── users.routes.ts
  └── users.schema.ts

workspaces/
  ├── workspaces.controller.ts
  ├── workspaces.service.ts
  ├── workspaces.routes.ts
  └── workspaces.schema.ts

documents/
  ├── documents.controller.ts
  ├── documents.service.ts
  ├── documents.routes.ts
  └── documents.schema.ts

conversations/
  ├── conversations.controller.ts
  ├── conversations.service.ts
  ├── conversations.routes.ts
  └── conversations.schema.ts

ai/
  ├── ai.service.ts
  ├── rag.service.ts
  ├── embedding.service.ts
  └── groq.service.ts
```

The exact folder structure may be adjusted during implementation.

---

# 28. API Request Lifecycle

A typical protected request follows:

```text
HTTP Request
     │
     ▼
Express
     │
     ▼
CORS Middleware
     │
     ▼
Security Middleware
     │
     ▼
Request Logger
     │
     ▼
Authentication Middleware
     │
     ▼
Validation Middleware
     │
     ▼
Route Handler
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
Database / External Service
     │
     ▼
Response
```

Errors are passed to a centralized error handler.

```text
Any Error
    │
    ▼
Error Middleware
    │
    ├── Log Internal Details
    │
    └── Return Safe API Error
```

---

# 29. AI Request Lifecycle

The complete AI request flow is:

```text
POST /conversations/:id/messages
              │
              ▼
       Authenticate User
              │
              ▼
      Validate Message
              │
              ▼
    Verify Conversation Owner
              │
              ▼
       Save User Message
              │
              ▼
     Generate Query Embedding
              │
              ▼
     Vector Similarity Search
              │
              ▼
     Retrieve Top K Chunks
              │
              ▼
       Build RAG Context
              │
              ▼
     Load Conversation History
              │
              ▼
       Build LLM Prompt
              │
              ▼
          Call Groq
              │
              ▼
      Receive AI Response
              │
              ▼
      Save Assistant Message
              │
              ▼
       Save Source References
              │
              ▼
         Return Response
```

This is the most important backend workflow in the application.

---

# 30. API Documentation

The API should eventually be documented using OpenAPI.

The project should expose interactive API documentation during development.

Potential endpoint:

```text
/api/docs
```

The exact documentation library will be selected during backend implementation.

Possible options include:

* OpenAPI + Swagger UI
* Scalar

The API documentation should describe:

* Endpoints
* Authentication
* Request bodies
* Response bodies
* Error responses
* Status codes

---

# 31. Database Access

The backend will use:

```text
Drizzle ORM
+
Drizzle Kit
+
PostgreSQL
```

The architecture is:

```text
Controller
    │
    ▼
Service
    │
    ▼
Repository / Database Layer
    │
    ▼
Drizzle ORM
    │
    ▼
PostgreSQL
```

Business logic should not be placed directly inside route definitions.

Routes should remain thin.

---

# 32. API Design Decisions

| Decision       | Choice                  | Reason                        |
| -------------- | ----------------------- | ----------------------------- |
| API Style      | REST                    | Simple and widely supported   |
| Versioning     | `/api/v1`               | Allows future API evolution   |
| Authentication | Access + Refresh Tokens | Secure session management     |
| Database ORM   | Drizzle                 | Type-safe and SQL-oriented    |
| Migration Tool | Drizzle Kit             | Integrated with Drizzle       |
| Validation     | Schema-based validation | Consistent input validation   |
| AI Provider    | Groq                    | Fast LLM inference            |
| Vector Search  | PostgreSQL + pgvector   | Simplified infrastructure     |
| Documentation  | OpenAPI                 | Standard API documentation    |
| Error Format   | Structured JSON         | Predictable frontend handling |
| Pagination     | Page + Limit initially  | Simple MVP implementation     |

---

# 33. Open Questions

The following implementation decisions remain:

1. Which validation library should be used?
2. Should authentication tokens be returned in JSON or HTTP-only cookies?
3. Which password hashing algorithm should be used?
4. Which embedding provider should be used?
5. Which Groq model should be used?
6. Which PDF extraction library should be used?
7. What chunk size and overlap should be used?
8. Should AI responses be streamed?
9. Should API documentation use Swagger UI or Scalar?
10. What rate limits should be applied?
11. What logging library should be used?
12. What testing framework should be used?

These will be finalized before or during implementation.

---

# 34. API Design Status

The API contract is now defined at the architectural level.

The next implementation phase will be:

```text
API Design
     │
     ▼
Backend Project Setup
     │
     ▼
Install Dependencies
     │
     ▼
Configure TypeScript
     │
     ▼
Configure Express
     │
     ▼
Configure Drizzle
     │
     ▼
Configure PostgreSQL
     │
     ▼
Create Database Schema
     │
     ▼
Create Migrations
     │
     ▼
Implement Authentication
```

The API design may be refined during implementation when concrete technical constraints are discovered.

All significant changes should be documented.

---

# 35. Final MVP API

The complete MVP API is:

```text
                    AI STUDY ASSISTANT API
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   AUTHENTICATION          USERS                WORKSPACES
        │                     │                     │
        ├── Register          ├── Get Me            ├── List
        ├── Login             ├── Update Me         ├── Create
        ├── Refresh           └── Change Password   ├── Get
        └── Logout                                  ├── Update
                                                    └── Delete
                                                          │
                                                          ▼
                                                     DOCUMENTS
                                                          │
                                                          ├── Upload
                                                          ├── List
                                                          ├── Get
                                                          ├── Status
                                                          └── Delete
                                                          │
                                                          ▼
                                                   CONVERSATIONS
                                                          │
                                                          ├── Create
                                                          ├── List
                                                          ├── Get
                                                          └── Delete
                                                          │
                                                          ▼
                                                      MESSAGES
                                                          │
                                                          ├── List
                                                          └── Ask AI
                                                               │
                                                               ▼
                                                           RAG + GROQ
```

This API represents the initial contract between the frontend and backend.
