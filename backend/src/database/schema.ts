import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// Users

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),

  passwordHash: text("password_hash").notNull(),

  fullName: text("full_name").notNull(),

  role: userRoleEnum("role").notNull().default("student"),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// Refresh Tokens

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.userId),

    index("refresh_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

// Workspaces

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("workspaces_owner_id_idx").on(table.ownerId)],
);

// Documents

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    title: text("title").notNull(),

    originalFileName: text("original_file_name").notNull(),

    mimeType: text("mime_type").notNull(),

    fileSize: integer("file_size").notNull(),

    storageKey: text("storage_key").notNull().unique(),

    status: documentStatusEnum("status").notNull().default("uploaded"),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_workspace_id_idx").on(table.workspaceId),

    index("documents_uploaded_by_idx").on(table.uploadedBy),

    index("documents_status_idx").on(table.status),
  ],
);

// Document Chunks

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, {
        onDelete: "cascade",
      }),

    content: text("content").notNull(),

    chunkIndex: integer("chunk_index").notNull(),

    pageNumber: integer("page_number").notNull(),

    tokenCount: integer("token_count"),

    embedding: vector("embedding", {
      dimensions: 512,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_chunks_document_id_idx").on(table.documentId),

    unique("document_chunks_document_id_chunk_index_unique").on(
      table.documentId,
      table.chunkIndex,
    ),
  ],
);

// Conversations
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull().default("New Conversation"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),

    index("conversations_workspace_id_idx").on(table.workspaceId),
  ],
);

// Messages

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, {
        onDelete: "cascade",
      }),

    role: messageRoleEnum("role").notNull(),

    content: text("content").notNull(),

    model: text("model"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),

    index("messages_created_at_idx").on(table.createdAt),
  ],
);

// Message Sources

export const messageSources = pgTable(
  "message_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, {
        onDelete: "cascade",
      }),

    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => documentChunks.id, {
        onDelete: "cascade",
      }),

    similarity: real("similarity"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("message_sources_message_id_idx").on(table.messageId),

    index("message_sources_chunk_id_idx").on(table.chunkId),
  ],
);

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),

  workspaces: many(workspaces),

  documents: many(documents),

  conversations: many(conversations),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),

  documents: many(documents),

  conversations: many(conversations),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),

  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),

  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(
  documentChunks,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentChunks.documentId],
      references: [documents.id],
    }),

    messageSources: many(messageSources),
  }),
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),

    workspace: one(workspaces, {
      fields: [conversations.workspaceId],
      references: [workspaces.id],
    }),

    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),

  sources: many(messageSources),
}));

export const messageSourcesRelations = relations(messageSources, ({ one }) => ({
  message: one(messages, {
    fields: [messageSources.messageId],
    references: [messages.id],
  }),

  chunk: one(documentChunks, {
    fields: [messageSources.chunkId],
    references: [documentChunks.id],
  }),
}));
