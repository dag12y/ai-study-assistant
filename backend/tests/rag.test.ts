import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";

vi.mock("../src/services/embedding.service.js", () => ({
  generateDocumentEmbedding: vi.fn(() =>
    Promise.resolve(Array.from({ length: 512 }, () => 0.1)),
  ),
}));

vi.mock("../src/services/llm.service.js", () => ({
  generateChatCompletion: vi.fn(() =>
    Promise.resolve("This is a deterministic test answer."),
  ),
}));

import { hashPassword } from "../src/modules/auth/auth.utils.js";

import { db } from "../src/database/client.js";
import { documents, users, workspaces } from "../src/database/schema.js";

import { localStorageService } from "../src/services/local-storage.service.js";
import { processDocument } from "../src/services/document-processing.service.js";
import {
  retrieveContext,
  generateRagAnswer,
} from "../src/services/rag.service.js";

describe("RAG", () => {
  let userId: string;
  let workspaceId: string;
  let documentId: string;
  let storageKey: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("StrongPassword123!");

    const [user] = await db
      .insert(users)
      .values({
        email: `rag-test-${Date.now()}@example.com`,
        passwordHash,
        fullName: "RAG Test User",
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
        name: "RAG Test Workspace",
      })
      .returning({
        id: workspaces.id,
      });

    if (!workspace) {
      throw new Error("Failed to create test workspace.");
    }

    workspaceId = workspace.id;

    // Load test PDF
    const fixturePath = path.resolve(
      process.cwd(),
      "tests/fixtures/amharic-test.pdf",
    );

    const pdfBuffer = await readFile(fixturePath);

    // Upload PDF
    storageKey = await localStorageService.upload({
      buffer: pdfBuffer,
      originalName: "rag-test.pdf",
      mimeType: "application/pdf",
    });

    // Create document
    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        uploadedBy: userId,
        title: "RAG Test Document",
        originalFileName: "rag-test.pdf",
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

    documentId = document.id;

    // Process:
    // PDF -> text -> chunks -> embeddings
    await processDocument(documentId);
  });

  afterAll(async () => {
    // Delete document and its chunks
    if (documentId) {
      await db.delete(documents).where(eq(documents.id, documentId));
    }

    // Delete uploaded file
    if (storageKey) {
      await localStorageService.delete(storageKey);
    }

    // Delete workspace
    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }

    // Delete user
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }

    // IMPORTANT:
    // Do NOT call pool.end() here.
    // The database pool is shared with the other Vitest tests.
  });

  it("should retrieve relevant context for a question", async () => {
    const question = "ሶበ ይነቅህ ካህን ተከሥተ ብርሃን ለኩሉ ዓለም ማን ነው ያለው?";

    const chunks = await retrieveContext(question, 5, userId);

    expect(chunks.length).toBeGreaterThan(0);

    expect(chunks[0]).toHaveProperty("content");
    expect(chunks[0]).toHaveProperty("similarity");

    expect(chunks[0]?.content).toBeTruthy();

    expect(chunks[0]?.documentId).toBe(documentId);

    expect(chunks[0]?.similarity).toBeGreaterThan(0);
  }, 30_000);

  it("should generate an answer using retrieved document context", async () => {
    const question = "ሶበ ይነቅህ ካህን ተከሥተ ብርሃን ለኩሉ ዓለም ማን ነው ያለው?";

    const result = await generateRagAnswer(question, 5, userId);
    console.log("RAG Result:", result);

    expect(result.answer).toBeTruthy();
    expect(typeof result.answer).toBe("string");

    expect(result.sources).toBeDefined();
    expect(Array.isArray(result.sources)).toBe(true);

    expect(result.sources.length).toBeGreaterThan(0);
  }, 30_000);
});
