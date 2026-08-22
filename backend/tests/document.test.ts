import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import request from "supertest";
import fs, { readFile } from "node:fs/promises";
import path from "node:path";

vi.mock("../src/services/embedding.service.js", () => ({
  generateDocumentEmbedding: vi.fn(() =>
    Promise.resolve(Array.from({ length: 512 }, () => 0.1)),
  ),
}));

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import {
  users,
  documents,
  workspaces,
  documentChunks,
} from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";
import { eq } from "drizzle-orm";

describe("Documents", () => {
  const password = "StrongPassword123!";

  let userId: string;
  let accessToken: string;

  let otherUserId: string;
  let otherAccessToken: string;

  let workspaceId: string;
  let documentId: string;
  let storageKey: string | undefined;

  const uploadsDir = path.resolve(process.cwd(), "uploads", "documents");

  beforeAll(async () => {
    // seed primary user
    const email = `doc-owner-${Date.now()}@example.com`;

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName: "Document Owner",
        role: "student",
      })
      .returning({ id: users.id });

    if (!user) throw new Error("Failed to seed document owner.");

    userId = user.id;

    const login = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });

    if (login.status !== 200) throw new Error("Failed to login owner.");

    accessToken = login.body.data.accessToken;

    // seed other user
    const otherEmail = `doc-other-${Date.now()}@example.com`;

    const otherPasswordHash = await hashPassword(password);

    const [otherUser] = await db
      .insert(users)
      .values({
        email: otherEmail,
        passwordHash: otherPasswordHash,
        fullName: "Other User",
        role: "student",
      })
      .returning({ id: users.id });

    if (!otherUser) throw new Error("Failed to seed other user.");

    otherUserId = otherUser.id;

    const otherLogin = await request(app).post("/api/v1/auth/login").send({
      email: otherEmail,
      password,
    });

    if (otherLogin.status !== 200)
      throw new Error("Failed to login other user.");

    otherAccessToken = otherLogin.body.data.accessToken;

    // create a workspace owned by primary user
    const createWs = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Docs Workspace" });

    if (createWs.status !== 201) throw new Error("Failed to create workspace.");

    workspaceId = createWs.body.data.id;
  });

  afterAll(async () => {
    // cleanup: delete created documents and workspaces and users
    if (documentId) {
      await db.delete(documents).where(eq(documents.id, documentId));
    }

    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }

    await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
      [userId, otherUserId],
    ]);

    // attempt to clean uploads directory
    try {
      const files = await fs.readdir(uploadsDir);
      await Promise.all(files.map((f) => fs.unlink(path.join(uploadsDir, f))));
    } catch (e) {
      // ignore
    }
  });

  describe("GET /api/v1/workspaces/:workspaceId/documents", () => {
    it("returns empty list for new workspace", async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents).toEqual([]);
    });

    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get(
        `/api/v1/workspaces/${workspaceId}/documents`,
      );
      expect(res.status).toBe(401);
    });

    it("rejects access from other user", async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${otherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/workspaces/:workspaceId/documents", () => {
    it("uploads a valid PDF", async () => {
      const pdf = Buffer.from("%PDF-1.4\\n%EOF\\n", "utf-8");

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "My PDF Document")
        .attach("file", pdf, {
          filename: "sample.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const doc = res.body.data.document;
      expect(doc).toHaveProperty("id");
      expect(doc.title).toBe("My PDF Document");
      expect(doc.status).toBe("uploaded");

      documentId = doc.id;

      // verify database record exists and storageKey present
      const dbDoc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
      });
      expect(dbDoc).toBeDefined();
      storageKey = dbDoc?.storageKey as string | undefined;
      expect(storageKey).toBeDefined();

      // verify file exists on disk
      const filePath = path.join(uploadsDir, path.basename(storageKey!));
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it("should upload a PDF and process it in the background", async () => {
      const pdfBuffer = await readFile(
        path.resolve(process.cwd(), "tests/fixtures/amharic-test.pdf"),
      );

      const response = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "Background Processing Test")
        .attach("file", pdfBuffer, {
          filename: "amharic-test.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(201);

      const documentId = response.body.data.document.id;

      expect(response.body.data.document).toMatchObject({
        id: documentId,
        title: "Background Processing Test",
        status: "uploaded",
      });

      let status = "uploaded";

      for (let attempt = 0; attempt < 60; attempt++) {
        const statusResponse = await request(app)
          .get(`/api/v1/documents/${documentId}/status`)
          .set("Authorization", `Bearer ${accessToken}`);

        expect(statusResponse.status).toBe(200);

        status = statusResponse.body.data.status;

        if (status === "ready" || status === "failed") {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(status).toBe("ready");

      const chunks = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));

      expect(chunks.length).toBeGreaterThan(0);

      await db.delete(documents).where(eq(documents.id, documentId));
    });

    it("rejects upload without file", async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "No file");

      expect(res.status).toBe(400);
    });

    it("rejects non-PDF files", async () => {
      const txt = Buffer.from("hello world", "utf-8");

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "Not a PDF")
        .attach("file", txt, {
          filename: "file.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(400);
    });

    it("rejects oversized file (>50MB)", async () => {
      // create a buffer > 50MB
      const large = Buffer.alloc(50 * 1024 * 1024 + 1, 0);

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "Large File")
        .attach("file", large, {
          filename: "big.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
    });

    it("rejects missing title", async () => {
      const pdf = Buffer.from("%PDF-1.4\\n%EOF\\n", "utf-8");

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", pdf, {
          filename: "sample.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
    });

    it("rejects upload by non-owner", async () => {
      const pdf = Buffer.from("%PDF-1.4\\n%EOF\\n", "utf-8");

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${otherAccessToken}`)
        .field("title", "Forbidden")
        .attach("file", pdf, {
          filename: "sample.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/documents/:documentId", () => {
    it("retrieves document metadata for owner", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toHaveProperty("id", documentId);
      expect(res.body.data.document).toHaveProperty("title");
      // storageKey should not be exposed in API
      expect(res.body.data.document).not.toHaveProperty("storageKey");
    });

    it("rejects unauthenticated access", async () => {
      const res = await request(app).get(`/api/v1/documents/${documentId}`);
      expect(res.status).toBe(401);
    });

    it("rejects other users", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}`)
        .set("Authorization", `Bearer ${otherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/documents/:documentId/status", () => {
    it("returns status for owner", async () => {
      const pdf = await readFile(
        path.resolve(process.cwd(), "tests/fixtures/amharic-test.pdf"),
      );

      const upload = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "Status Test Document")
        .attach("file", pdf, {
          filename: "status-test.pdf",
          contentType: "application/pdf",
        });

      expect(upload.status).toBe(201);

      documentId = upload.body.data.document.id;

      let status = "uploaded";

      for (let attempt = 0; attempt < 20; attempt++) {
        const res = await request(app)
          .get(`/api/v1/documents/${documentId}/status`)
          .set("Authorization", `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.documentId).toBe(documentId);

        status = res.body.data.status;

        if (status === "ready" || status === "failed") {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(status).toBe("ready");
    });
    it("rejects unauthenticated", async () => {
      const res = await request(app).get(
        `/api/v1/documents/${documentId}/status`,
      );
      expect(res.status).toBe(401);
    });

    it("rejects other user", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}/status`)
        .set("Authorization", `Bearer ${otherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/documents/:documentId", () => {
    it("allows owner to delete and removes file and record", async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(204);

      // DB record gone
      const dbDoc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
      });
      expect(dbDoc).toBeUndefined();

      // file removed
      if (storageKey) {
        const filePath = path.join(uploadsDir, path.basename(storageKey));
        try {
          await fs.stat(filePath);
          // if exists, fail
          throw new Error("File was not deleted");
        } catch (e) {
          // expect ENOENT
        }
      }
    });

    it("returns 404 when deleting again", async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it("prevents other users from deleting", async () => {
      // create another document to test
      const pdf = Buffer.from("%PDF-1.4\\n%EOF\\n", "utf-8");

      const create = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/documents`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "ToDelete")
        .attach("file", pdf, {
          filename: "todelete.pdf",
          contentType: "application/pdf",
        });

      expect(create.status).toBe(201);
      const newDocId = create.body.data.document.id;

      const res = await request(app)
        .delete(`/api/v1/documents/${newDocId}`)
        .set("Authorization", `Bearer ${otherAccessToken}`);

      expect(res.status).toBe(404);

      // cleanup: owner deletes
      const cleanup = await request(app)
        .delete(`/api/v1/documents/${newDocId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(cleanup.status).toBe(204);
    });
  });
});
