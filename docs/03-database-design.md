# AI Study Assistant — Database Design

**Document:** 03 — Database Design

**Project:** AI Study Assistant

**Database:** PostgreSQL

**Vector Extension:** pgvector

**Status:** Draft

**Version:** 1.0

**Last Updated:** 2026-07-31

---

# 1. Overview

The AI Study Assistant uses PostgreSQL as its primary database.

The database is responsible for storing:

* User accounts
* Authentication sessions
* Study workspaces
* Uploaded document metadata
* Document processing state
* Extracted document chunks
* Vector embeddings
* Conversations
* Chat messages
* Source references

The `pgvector` PostgreSQL extension will be used to store document embeddings and perform vector similarity searches.

The initial database design prioritizes:

* Data integrity
* Referential integrity
* Secure data isolation
* Efficient querying
* Clear relationships
* Future scalability
* Maintainability

---

# 2. Database Architecture

The database consists of the following core entities:

```text
users
  │
  ├───────────────┐
  │               │
  ▼               ▼
workspaces    refresh_tokens
  │
  ├───────────────┐
  │               │
  ▼               ▼
documents     conversations
  │               │
  ▼               ▼
document_chunks messages
  │               │
  ▼               ▼
embeddings    message_sources
                    │
                    ▼
              document_chunks
```

The primary relationship hierarchy is:

```text
User
 │
 ├── Workspaces
 │       │
 │       ├── Documents
 │       │      │
 │       │      └── Document Chunks
 │       │             │
 │       │             └── Embeddings
 │       │
 │       └── Conversations
 │              │
 │              └── Messages
 │                     │
 │                     └── Message Sources
 │                            │
 │                            └── Document Chunks
 │
 └── Refresh Tokens
```

---

# 3. Database Design Principles

## 3.1 UUID Primary Keys

The system will use UUIDs as primary keys for application entities.

Example:

```text
550e8400-e29b-41d4-a716-446655440000
```

UUIDs are preferred because:

* They are difficult to guess.
* They do not expose sequential record counts.
* They are suitable for distributed systems.
* They can be generated independently by different services.

UUIDs will be used for:

* Users
* Refresh tokens
* Workspaces
* Documents
* Document chunks
* Conversations
* Messages
* Message sources

---

## 3.2 Timestamps

Tables will use:

```text
created_at
updated_at
```

where appropriate.

Timestamps will be stored using PostgreSQL's `TIMESTAMPTZ` type.

Example:

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

This ensures timestamps contain timezone information.

---

## 3.3 Naming Convention

Database identifiers will use `snake_case`.

Examples:

```text
user_id
workspace_id
document_id
created_at
updated_at
```

Tables will use plural names:

```text
users
workspaces
documents
```

---

# 4. Entity Relationship Diagram

The conceptual database relationship is:

```text
┌──────────────┐
│    users     │
├──────────────┤
│ id           │
│ name         │
│ email        │
│ password_hash│
│ created_at   │
│ updated_at   │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│  workspaces  │
├──────────────┤
│ id           │
│ user_id      │
│ name         │
│ created_at   │
│ updated_at   │
└──────┬───────┘
       │
       ├──────────────────────────┐
       │                          │
       │ 1:N                      │ 1:N
       ▼                          ▼
┌──────────────┐          ┌─────────────────┐
│  documents   │          │ conversations   │
├──────────────┤          ├─────────────────┤
│ id           │          │ id              │
│ workspace_id │          │ workspace_id    │
│ title        │          │ title           │
│ filename     │          │ created_at      │
│ storage_key  │          │ updated_at      │
│ status       │          └────────┬────────┘
│ created_at   │                   │
│ updated_at   │                   │ 1:N
└──────┬───────┘                   ▼
       │                    ┌─────────────────┐
       │ 1:N                │    messages     │
       ▼                    ├─────────────────┤
┌────────────────┐          │ id              │
│document_chunks │          │ conversation_id │
├────────────────┤          │ role            │
│ id             │          │ content         │
│ document_id    │          │ created_at      │
│ chunk_index    │          └────────┬────────┘
│ content        │                   │
│ page_number    │                   │ 1:N
│ embedding      │                   ▼
└────────────────┘          ┌─────────────────┐
                            │ message_sources │
                            ├─────────────────┤
                            │ id              │
                            │ message_id      │
                            │ chunk_id        │
                            │ relevance_score │
                            └─────────────────┘
```

---

# 5. Users Table

The `users` table stores application user accounts.

## Table

```text
users
```

## Columns

| Column        | Type         | Constraints      | Description            |
| ------------- | ------------ | ---------------- | ---------------------- |
| id            | UUID         | PK               | Unique user identifier |
| name          | VARCHAR(100) | NOT NULL         | User's display name    |
| email         | VARCHAR(255) | NOT NULL, UNIQUE | User's email           |
| password_hash | TEXT         | NOT NULL         | Secure password hash   |
| created_at    | TIMESTAMPTZ  | NOT NULL         | Account creation time  |
| updated_at    | TIMESTAMPTZ  | NOT NULL         | Last update time       |

## Constraints

```text
PRIMARY KEY (id)
UNIQUE (email)
```

Email addresses should be normalized before storage.

For example:

```text
Dagim@Example.com
```

should be normalized to:

```text
dagim@example.com
```

The application layer will be responsible for password hashing.

Plain-text passwords must never be stored.

---

# 6. Refresh Tokens Table

Refresh tokens are used to maintain authenticated sessions.

## Table

```text
refresh_tokens
```

## Columns

| Column     | Type        | Constraints | Description          |
| ---------- | ----------- | ----------- | -------------------- |
| id         | UUID        | PK          | Token record ID      |
| user_id    | UUID        | FK          | Token owner          |
| token_hash | TEXT        | NOT NULL    | Hashed refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL    | Token expiration     |
| revoked_at | TIMESTAMPTZ | NULL        | Revocation time      |
| created_at | TIMESTAMPTZ | NOT NULL    | Creation time        |

Relationship:

```text
users 1 ──────── N refresh_tokens
```

Refresh tokens should be stored as hashes rather than plain-text token values.

This allows the system to revoke individual sessions.

---

# 7. Workspaces Table

A workspace represents a subject or collection of related study materials.

## Table

```text
workspaces
```

## Columns

| Column     | Type         | Constraints | Description          |
| ---------- | ------------ | ----------- | -------------------- |
| id         | UUID         | PK          | Workspace identifier |
| user_id    | UUID         | FK          | Workspace owner      |
| name       | VARCHAR(150) | NOT NULL    | Workspace name       |
| created_at | TIMESTAMPTZ  | NOT NULL    | Creation time        |
| updated_at | TIMESTAMPTZ  | NOT NULL    | Last update time     |

Relationship:

```text
users 1 ──────── N workspaces
```

A workspace belongs to exactly one user.

Example:

```text
User: Dagm

Workspaces:
├── Machine Learning
├── Database Systems
└── Global Affairs
```

---

# 8. Documents Table

The `documents` table stores metadata about uploaded files.

The actual binary file is not stored directly in PostgreSQL.

## Table

```text
documents
```

## Columns

| Column            | Type         | Constraints | Description                    |
| ----------------- | ------------ | ----------- | ------------------------------ |
| id                | UUID         | PK          | Document identifier            |
| workspace_id      | UUID         | FK          | Parent workspace               |
| title             | VARCHAR(255) | NOT NULL    | User-facing title              |
| original_filename | VARCHAR(255) | NOT NULL    | Original uploaded filename     |
| storage_key       | TEXT         | NOT NULL    | File storage identifier        |
| mime_type         | VARCHAR(100) | NOT NULL    | MIME type                      |
| file_size         | BIGINT       | NOT NULL    | File size in bytes             |
| status            | VARCHAR(20)  | NOT NULL    | Processing status              |
| error_message     | TEXT         | NULL        | Processing failure information |
| created_at        | TIMESTAMPTZ  | NOT NULL    | Upload time                    |
| updated_at        | TIMESTAMPTZ  | NOT NULL    | Last update time               |

---

## Document Status

The `status` field will represent:

```text
UPLOADED
PROCESSING
READY
FAILED
```

The application should only allow valid status values.

A PostgreSQL enum or a `CHECK` constraint may be used.

The initial design will use a `CHECK` constraint to avoid unnecessary database enum migration complexity.

Example:

```sql
CHECK (
    status IN (
        'UPLOADED',
        'PROCESSING',
        'READY',
        'FAILED'
    )
)
```

---

# 9. Document Chunks Table

Documents are split into smaller pieces before embedding and retrieval.

The `document_chunks` table stores these pieces.

## Table

```text
document_chunks
```

## Columns

| Column      | Type        | Constraints | Description                    |
| ----------- | ----------- | ----------- | ------------------------------ |
| id          | UUID        | PK          | Chunk identifier               |
| document_id | UUID        | FK          | Parent document                |
| chunk_index | INTEGER     | NOT NULL    | Position in document           |
| content     | TEXT        | NOT NULL    | Extracted chunk text           |
| page_number | INTEGER     | NULL        | Source page number             |
| metadata    | JSONB       | NULL        | Additional extraction metadata |
| embedding   | VECTOR      | NOT NULL    | Vector representation          |
| created_at  | TIMESTAMPTZ | NOT NULL    | Creation time                  |

Relationship:

```text
documents 1 ──────── N document_chunks
```

Example:

```text
Document
│
├── Chunk 0
├── Chunk 1
├── Chunk 2
├── Chunk 3
└── Chunk 4
```

The `chunk_index` allows chunks to be reconstructed in their original order.

---

# 10. Vector Embeddings

The `embedding` column will use the PostgreSQL `vector` type provided by `pgvector`.

The exact vector dimension depends on the selected embedding model.

The dimension will be finalized before database migration creation.

Conceptually:

```sql
embedding VECTOR(N)
```

Where `N` is the embedding dimension.

The system will use vector similarity search to retrieve relevant document chunks.

Example query concept:

```text
User Question
      │
      ▼
Question Embedding
      │
      ▼
Compare with Document Chunk Embeddings
      │
      ▼
Calculate Similarity
      │
      ▼
Return Top K Chunks
```

The database will use an appropriate vector index after benchmarking the expected dataset size and query patterns.

Potential index types include:

* HNSW
* IVFFlat

The final choice will be documented during implementation.

---

# 11. Conversations Table

A conversation represents a study session within a workspace.

## Table

```text
conversations
```

## Columns

| Column       | Type         | Constraints | Description             |
| ------------ | ------------ | ----------- | ----------------------- |
| id           | UUID         | PK          | Conversation identifier |
| workspace_id | UUID         | FK          | Parent workspace        |
| title        | VARCHAR(255) | NOT NULL    | Conversation title      |
| created_at   | TIMESTAMPTZ  | NOT NULL    | Creation time           |
| updated_at   | TIMESTAMPTZ  | NOT NULL    | Last activity           |

Relationship:

```text
workspaces 1 ──────── N conversations
```

Example:

```text
Machine Learning Workspace

Conversations:
├── Supervised Learning
├── Neural Networks
└── Model Evaluation
```

---

# 12. Messages Table

The `messages` table stores conversation messages.

## Table

```text
messages
```

## Columns

| Column          | Type        | Constraints | Description           |
| --------------- | ----------- | ----------- | --------------------- |
| id              | UUID        | PK          | Message identifier    |
| conversation_id | UUID        | FK          | Parent conversation   |
| role            | VARCHAR(20) | NOT NULL    | Message sender role   |
| content         | TEXT        | NOT NULL    | Message content       |
| created_at      | TIMESTAMPTZ | NOT NULL    | Message creation time |

The `role` field can contain:

```text
USER
ASSISTANT
```

A `CHECK` constraint should ensure only valid roles are stored.

Example:

```sql
CHECK (
    role IN ('USER', 'ASSISTANT')
)
```

Relationship:

```text
conversations 1 ──────── N messages
```

Messages should be retrieved in chronological order.

---

# 13. Message Sources Table

The `message_sources` table connects an AI response to the document chunks retrieved during RAG.

This allows the application to show users where an AI answer came from.

## Table

```text
message_sources
```

## Columns

| Column          | Type             | Constraints | Description                |
| --------------- | ---------------- | ----------- | -------------------------- |
| id              | UUID             | PK          | Source identifier          |
| message_id      | UUID             | FK          | AI message                 |
| chunk_id        | UUID             | FK          | Retrieved document chunk   |
| relevance_score | DOUBLE PRECISION | NOT NULL    | Retrieval similarity score |
| rank            | INTEGER          | NOT NULL    | Retrieval rank             |
| created_at      | TIMESTAMPTZ      | NOT NULL    | Creation time              |

Relationships:

```text
messages 1 ──────── N message_sources

document_chunks 1 ──────── N message_sources
```

This creates a many-to-many relationship between AI messages and document chunks.

Example:

```text
AI Message
│
├── Source 1 → Chunk 12 → Page 4
├── Source 2 → Chunk 18 → Page 5
└── Source 3 → Chunk 24 → Page 7
```

---

# 14. Complete Relationship Model

The full database relationship is:

```text
users
 │
 ├───────────────┐
 │               │
 │               ▼
 │        refresh_tokens
 │
 ▼
workspaces
 │
 ├──────────────────────┐
 │                      │
 ▼                      ▼
documents          conversations
 │                      │
 ▼                      ▼
document_chunks      messages
 │                      │
 └──────────────┐       ▼
                │  message_sources
                │       │
                └───────┘
```

---

# 15. Foreign Key Rules

The database must enforce referential integrity.

Recommended deletion behavior:

### User → Workspaces

```text
ON DELETE CASCADE
```

Deleting a user removes their workspaces.

### User → Refresh Tokens

```text
ON DELETE CASCADE
```

Deleting a user removes their active sessions.

### Workspace → Documents

```text
ON DELETE CASCADE
```

Deleting a workspace removes its document metadata.

The application must also delete associated stored files.

### Workspace → Conversations

```text
ON DELETE CASCADE
```

Deleting a workspace removes its conversations.

### Document → Document Chunks

```text
ON DELETE CASCADE
```

Deleting a document removes its chunks and embeddings.

### Conversation → Messages

```text
ON DELETE CASCADE
```

Deleting a conversation removes its messages.

### Message → Message Sources

```text
ON DELETE CASCADE
```

Deleting an AI message removes its source references.

### Document Chunk → Message Sources

```text
ON DELETE CASCADE
```

Deleting a document chunk removes references to it.

---

# 16. Resource Ownership and Authorization

Database relationships alone are not sufficient for authorization.

For example:

```text
GET /api/v1/documents/:documentId
```

The backend must verify:

```text
Authenticated User
        │
        ▼
Document
        │
        ▼
Document Workspace
        │
        ▼
Workspace Owner
        │
        ▼
Authenticated User
```

Conceptually:

```text
User ID == Workspace User ID
```

The application must perform these ownership checks before returning protected resources.

This prevents IDOR-style authorization vulnerabilities.

---

# 17. Indexing Strategy

Indexes will be created for frequently queried columns.

Initial indexes:

### Users

```text
users.email
```

Reason:

Used during login and authentication.

---

### Refresh Tokens

```text
refresh_tokens.user_id
refresh_tokens.expires_at
```

Reason:

Used for session lookup and token cleanup.

---

### Workspaces

```text
workspaces.user_id
```

Reason:

Used to retrieve a user's workspaces.

---

### Documents

```text
documents.workspace_id
documents.status
```

Reason:

Used to retrieve workspace documents and filter processing states.

---

### Document Chunks

```text
document_chunks.document_id
```

Reason:

Used to retrieve chunks belonging to a document.

A vector index will also be added to:

```text
document_chunks.embedding
```

The exact index strategy will depend on the selected vector index type.

---

### Conversations

```text
conversations.workspace_id
conversations.updated_at
```

Reason:

Used to retrieve recent workspace conversations.

---

### Messages

```text
messages.conversation_id
messages.created_at
```

Reason:

Used to retrieve conversation history in chronological order.

---

### Message Sources

```text
message_sources.message_id
message_sources.chunk_id
```

Reason:

Used to retrieve sources for AI messages.

---

# 18. Data Integrity Constraints

The database should enforce important business rules wherever practical.

Examples:

### Unique User Email

```text
users.email UNIQUE
```

### Unique Chunk Position

A document should not contain duplicate chunk positions.

Conceptually:

```text
UNIQUE(document_id, chunk_index)
```

### Valid Document Status

```text
UPLOADED
PROCESSING
READY
FAILED
```

### Valid Message Role

```text
USER
ASSISTANT
```

### Positive File Size

```text
file_size > 0
```

### Valid Page Number

If present:

```text
page_number > 0
```

### Valid Retrieval Rank

```text
rank > 0
```

Constraints should be implemented at the database layer when they represent fundamental data integrity rules.

---

# 19. Document Metadata

The `metadata` JSONB field on `document_chunks` allows the system to store extraction-specific information without constantly changing the database schema.

Possible metadata:

```json
{
  "section": "Introduction",
  "heading": "Supervised Learning",
  "start_character": 1024,
  "end_character": 2048
}
```

The exact metadata structure may evolve based on the document processing implementation.

Page number should remain a dedicated column because it is frequently used for source citations.

---

# 20. Data Lifecycle

The expected lifecycle of a document is:

```text
Upload
  │
  ▼
Create Document Record
  │
  ▼
UPLOADED
  │
  ▼
PROCESSING
  │
  ├── Success
  │      │
  │      ▼
  │    READY
  │
  └── Failure
         │
         ▼
       FAILED
```

When a document is deleted:

```text
Delete Document
      │
      ├── Delete Stored File
      │
      ├── Delete Document Record
      │
      └── Cascade Delete Chunks
                 │
                 ▼
            Delete Embeddings
```

The file storage deletion and database deletion must be handled carefully to avoid orphaned files or inconsistent state.

---

# 21. RAG Data Flow

The database participates in the RAG process in two main stages.

## Ingestion

```text
PDF
 │
 ▼
Extract Text
 │
 ▼
Create Chunks
 │
 ▼
Generate Embeddings
 │
 ▼
Store in document_chunks
```

## Retrieval

```text
User Question
 │
 ▼
Generate Query Embedding
 │
 ▼
Search document_chunks.embedding
 │
 ▼
Retrieve Top K Chunks
 │
 ▼
Build AI Context
 │
 ▼
Generate Answer
 │
 ▼
Store Message
 │
 ▼
Store message_sources
```

The `message_sources` table provides traceability between generated answers and retrieved document content.

---

# 22. Database Migration Strategy

The database schema will be managed using version-controlled migrations.

Every schema change must be represented by a migration.

Example:

```text
migrations/
├── 001_create_users
├── 002_create_refresh_tokens
├── 003_create_workspaces
├── 004_create_documents
├── 005_create_document_chunks
├── 006_create_conversations
├── 007_create_messages
└── 008_create_message_sources
```

The migration tool will be selected during backend implementation.

Possible options include:

* Prisma Migrate
* Drizzle Kit
* Knex migrations
* node-pg-migrate

The final choice will be documented as an architectural decision.

---

# 23. Database Environment

The application will connect to PostgreSQL using environment variables.

Example:

```text
DATABASE_URL
```

The actual database credentials must never be committed to Git.

The repository will provide:

```text
.env.example
```

Example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_study_assistant
```

The actual `.env` file remains local or managed securely in production.

---

# 24. Initial Schema Summary

The MVP database contains:

```text
users
│
├── refresh_tokens
│
└── workspaces
      │
      ├── documents
      │     │
      │     └── document_chunks
      │            │
      │            └── embedding
      │
      └── conversations
            │
            └── messages
                  │
                  └── message_sources
                        │
                        └── document_chunks
```

Total core tables:

```text
1. users
2. refresh_tokens
3. workspaces
4. documents
5. document_chunks
6. conversations
7. messages
8. message_sources
```

---

# 25. Design Decisions

| Decision                | Choice                      | Reason                                   |
| ----------------------- | --------------------------- | ---------------------------------------- |
| Primary Database        | PostgreSQL                  | Reliable relational database             |
| Primary Keys            | UUID                        | Secure and distributed-system friendly   |
| Timestamps              | TIMESTAMPTZ                 | Timezone-aware                           |
| Vector Storage          | pgvector                    | Keep relational and vector data together |
| Document Files          | External Storage            | Avoid large binary data in database      |
| Document Status         | CHECK constraint            | Flexible migration strategy              |
| Message Roles           | CHECK constraint            | Enforce valid values                     |
| Authentication Sessions | Refresh Token Table         | Supports session revocation              |
| RAG Sources             | Separate Table              | Provides traceability                    |
| Schema Changes          | Versioned Migrations        | Reproducibility and collaboration        |
| Architecture            | Normalized Relational Model | Data integrity and maintainability       |

---

# 26. Open Questions

The following decisions must be finalized during implementation:

1. Which ORM or database client will be used?
2. Which migration tool will be used?
3. Which embedding model will be used?
4. What embedding dimension will be stored?
5. Which vector index should be used?
6. How many chunks should be retrieved per query?
7. How should chunks be sized and overlapped?
8. Should documents support soft deletion?
9. Should message sources store snapshots of source metadata?
10. Should conversation titles be generated automatically?
11. Should refresh tokens be rotated on every refresh?
12. How should file deletion and database deletion remain consistent?

These decisions should be documented before implementation.

---

# 27. Database Design Status

The database design is currently a conceptual and logical design.

Before implementation, the following must be completed:

```text
Database Design
      │
      ▼
Select ORM / Database Client
      │
      ▼
Select Migration Tool
      │
      ▼
Select Embedding Model
      │
      ▼
Confirm Vector Dimension
      │
      ▼
Create SQL Schema
      │
      ▼
Create Initial Migrations
      │
      ▼
Run Migrations
      │
      ▼
Verify Database
```

The next design document is:

```text
04-api-design.md
```

The API design will translate the product requirements and database model into a formal backend API contract.
