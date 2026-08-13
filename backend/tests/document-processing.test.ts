import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "../src/database/client.js";
import {
  documentChunks,
  documents,
  users,
  workspaces,
} from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";
import { localStorageService } from "../src/services/local-storage.service.js";
import { processDocument } from "../src/services/document-processing.service.js";

describe("Document Processing", () => {
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

  it("should process a PDF and save document chunks", async () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "tests/fixtures/amharic-test.pdf",
    );

    const pdfBuffer = await readFile(fixturePath);

    storageKey = await localStorageService.upload({
      buffer: pdfBuffer,
      originalName: "amharic-test.pdf",
      mimeType: "application/pdf",
    });

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        uploadedBy: userId,
        title: "Amharic Test Document",
        originalFileName: "amharic-test.pdf",
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

    const result = await processDocument(documentId);

    expect(result.document.id).toBe(documentId);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(0);

    const savedChunks = await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));

    expect(savedChunks.length).toBe(result.chunks.length);

    expect(savedChunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId,
          chunkIndex: 0,
        }),
      ]),
    );
  });
});
