import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { hashPassword } from "../src/modules/auth/auth.utils.js";

import { db, pool } from "../src/database/client.js";
import {
  documentChunks,
  documents,
  users,
  workspaces,
} from "../src/database/schema.js";
import { localStorageService } from "../src/services/local-storage.service.js";
import { processDocument } from "../src/services/document-processing.service.js";
import { generateDocumentEmbedding } from "../src/services/embedding.service.js";
import { searchSimilarChunks } from "../src/services/vector-search.service.js";

describe("Vector search", () => {
  let userId: string;
  let workspaceId: string;
  let documentId: string;
  let storageKey: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("StrongPassword123!");

    const [user] = await db
      .insert(users)
      .values({
        email: `document-processing-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Document Processing Test User",
        role: "student",
      })
      .returning({
        id: users.id,
      });

    if (!user) {
      throw new Error("Failed to create test user.");
    }

    userId = user.id;

    const [workspace] = await db
      .insert(workspaces)
      .values({
        ownerId: userId,
        name: "Document Processing Test Workspace",
      })
      .returning({
        id: workspaces.id,
      });

    if (!workspace) {
      throw new Error("Failed to create test workspace.");
    }

    workspaceId = workspace.id;
  });

  afterAll(async () => {
    if (documentId) {
      await db.delete(documents).where(eq(documents.id, documentId));
    }

    if (storageKey) {
      await localStorageService.delete(storageKey);
    }

    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }

    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }

    await pool.end();
  });
  it("should retrieve the most similar document chunks", async () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "tests/fixtures/amharic-test.pdf",
    );

    const pdfBuffer = await readFile(fixturePath);

    const storageKey = await localStorageService.upload({
      buffer: pdfBuffer,
      originalName: "amharic-vector-search-test.pdf",
      mimeType: "application/pdf",
    });

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        uploadedBy: userId,
        title: "Vector Search Test",
        originalFileName: "amharic-vector-search-test.pdf",
        mimeType: "application/pdf",
        fileSize: pdfBuffer.length,
        storageKey,
        status: "uploaded",
      })
      .returning({
        id: documents.id,
      });

    if (!document) {
      throw new Error("Failed to create test document.");
    }

    try {
      await processDocument(document.id);

      const [sourceChunk] = await db
        .select({
          content: documentChunks.content,
        })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, document.id))
        .limit(1);

      expect(sourceChunk).toBeDefined();
      expect(sourceChunk?.content).toBeTruthy();

      const queryEmbedding = await generateDocumentEmbedding(
        sourceChunk!.content,
      );

      const results = await searchSimilarChunks(queryEmbedding, 5);

      expect(results.length).toBeGreaterThan(0);

      const matchingChunk = results.find(
        (result) => result.documentId === document.id,
      );

      expect(matchingChunk).toBeDefined();
      expect(matchingChunk?.content).toBe(sourceChunk!.content);
      expect(matchingChunk?.similarity).toBeGreaterThan(0.9);
    } finally {
      await db.delete(documents).where(eq(documents.id, document.id));

      await localStorageService.delete(storageKey);
    }
  }, 30_000);
});
