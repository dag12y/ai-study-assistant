import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

vi.mock("../src/services/document-processing.service.js", () => ({
  processDocument: vi.fn().mockResolvedValue(undefined),
}));

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import { documents, users, workspaces } from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";
import { localStorageService } from "../src/services/local-storage.service.js";

const pdf = Buffer.from("%PDF-1.4\n%EOF\n", "utf-8");

describe("Root documents API", () => {
  const password = "StrongPassword123!";
  let userId: string;
  let otherUserId: string;
  let workspaceId: string;
  let accessToken: string;
  let otherAccessToken: string;
  let documentId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email: `documents-root-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Root Documents User",
        role: "student",
      })
      .returning({ id: users.id, email: users.email });

    if (!user) throw new Error("Failed to create root documents user.");
    userId = user.id;

    const [otherUser] = await db
      .insert(users)
      .values({
        email: `documents-root-other-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Other Root Documents User",
        role: "student",
      })
      .returning({ id: users.id, email: users.email });

    if (!otherUser) throw new Error("Failed to create other documents user.");
    otherUserId = otherUser.id;

    const [workspace] = await db
      .insert(workspaces)
      .values({ ownerId: userId, name: "Root Documents Workspace" })
      .returning({ id: workspaces.id });

    if (!workspace)
      throw new Error("Failed to create root documents workspace.");
    workspaceId = workspace.id;

    const login = await request(app).post("/api/v1/auth/login").send({
      email: user.email,
      password,
    });
    const otherLogin = await request(app).post("/api/v1/auth/login").send({
      email: otherUser.email,
      password,
    });

    expect(login.status).toBe(200);
    expect(otherLogin.status).toBe(200);
    accessToken = login.body.data.accessToken;
    otherAccessToken = otherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    const storedDocuments = await db
      .select({ storageKey: documents.storageKey })
      .from(documents)
      .where(eq(documents.workspaceId, workspaceId));

    await Promise.all(
      storedDocuments.map((document) =>
        localStorageService.delete(document.storageKey),
      ),
    );
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, otherUserId));
    await pool.end();
  });

  it("rejects unauthenticated listing", async () => {
    const response = await request(app).get("/api/v1/documents");

    expect(response.status).toBe(401);
  });

  it("uploads and lists an owned PDF", async () => {
    const upload = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("workspaceId", workspaceId)
      .field("title", "Root API PDF")
      .attach("file", pdf, {
        filename: "root-api.pdf",
        contentType: "application/pdf",
      });

    expect(upload.status).toBe(201);
    expect(upload.body.data.document).toMatchObject({
      title: "Root API PDF",
      status: "uploaded",
    });
    documentId = upload.body.data.document.id;

    const list = await request(app)
      .get(`/api/v1/documents?workspaceId=${workspaceId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.documents).toEqual([
      expect.objectContaining({ id: documentId, title: "Root API PDF" }),
    ]);
  });

  it("hides owned documents from another user", async () => {
    const response = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${otherAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.documents).toEqual([]);
  });

  it("validates document UUIDs and protects detail access", async () => {
    const invalid = await request(app)
      .get("/api/v1/documents/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(invalid.status).toBe(400);

    const forbidden = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${otherAccessToken}`);
    expect(forbidden.status).toBe(404);
  });

  it("allows the owner to delete the document only", async () => {
    const forbidden = await request(app)
      .delete(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${otherAccessToken}`);
    expect(forbidden.status).toBe(404);

    const deleted = await request(app)
      .delete(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(missing.status).toBe(404);
  });
});
