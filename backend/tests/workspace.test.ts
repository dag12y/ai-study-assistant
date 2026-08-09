import { afterAll, beforeAll, describe, expect, it } from "vitest";

import request from "supertest";

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import { users } from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";

describe("Workspaces", () => {
  const testEmail = `workspace-${Date.now()}@example.com`;
  const password = "StrongPassword123!";

  let accessToken: string;
  let userId: string;
  let secondUserId: string;
  let secondAccessToken: string;

  beforeAll(async () => {
    // first user

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        passwordHash,
        fullName: "Workspace Test User",
        role: "student",
      })
      .returning({
        id: users.id,
      });

    if (!user) {
      throw new Error("Failed to seed workspace test user.");
    }

    userId = user.id;

    const login = await request(app).post("/api/v1/auth/login").send({
      email: testEmail,
      password,
    });

    if (login.status !== 200) {
      throw new Error("Failed to login workspace test user.");
    }

    accessToken = login.body.data.accessToken;

    // second user

    const secondEmail = `workspace-second-${Date.now()}@example.com`;

    const secondPasswordHash = await hashPassword(password);

    const [secondUser] = await db
      .insert(users)
      .values({
        email: secondEmail,
        passwordHash: secondPasswordHash,
        fullName: "Second Workspace User",
        role: "student",
      })
      .returning({
        id: users.id,
      });

    if (!secondUser) {
      throw new Error("Failed to seed second workspace test user.");
    }

    secondUserId = secondUser.id;

    const secondLogin = await request(app).post("/api/v1/auth/login").send({
      email: secondEmail,
      password,
    });

    if (secondLogin.status !== 200) {
      throw new Error("Failed to login second workspace test user.");
    }

    secondAccessToken = secondLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
      [userId, secondUserId],
    ]);
  });

  describe("POST /api/v1/workspaces", () => {
    it("should create a workspace", async () => {
      const response = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "My Study Workspace",
          description: "Workspace for my study materials.",
        });

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          ownerId: userId,
          name: "My Study Workspace",
          description: "Workspace for my study materials.",
        },
      });
    });

    it("should reject an unauthenticated request", async () => {
      const response = await request(app).post("/api/v1/workspaces").send({
        name: "Unauthorized Workspace",
      });

      expect(response.status).toBe(401);
    });

    it("should reject an invalid workspace name", async () => {
      const response = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/workspaces", () => {
    it("should list the user's workspaces", async () => {
      const response = await request(app)
        .get("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ownerId: userId,
            name: "My Study Workspace",
          }),
        ]),
      );
    });
  });

  describe("GET /api/v1/workspaces/:workspaceId", () => {
    it("should retrieve a workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Retrieve Workspace",
        });

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        id: workspaceId,
        ownerId: userId,
        name: "Retrieve Workspace",
      });
    });

    it("should return 404 for a nonexistent workspace", async () => {
      const response = await request(app)
        .get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);

      expect(response.body.error.code).toBe("WORKSPACE_NOT_FOUND");
    });

    it("should not allow another user to retrieve the workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Private Workspace",
        });

      expect(create.status).toBe(201);

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);

      expect(response.status).toBe(404);

      expect(response.body.error.code).toBe("WORKSPACE_NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/workspaces/:workspaceId", () => {
    it("should update a workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Old Workspace Name",
          description: "Old description",
        });

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Updated Workspace Name",
          description: "Updated description",
        });

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        id: workspaceId,
        name: "Updated Workspace Name",
        description: "Updated description",
      });
    });

    it("should not allow another user to update the workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Private Workspace",
        });

      expect(create.status).toBe(201);

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send({
          name: "Hacked Workspace",
        });

      expect(response.status).toBe(404);

      expect(response.body.error.code).toBe("WORKSPACE_NOT_FOUND");
    });
  });

  describe("DELETE /api/v1/workspaces/:workspaceId", () => {
    it("should delete a workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Workspace To Delete",
        });

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        success: true,
        data: null,
      });

      const check = await db.query.workspaces.findFirst({
        where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
      });

      expect(check).toBeUndefined();
    });

    it("should not allow another user to delete the workspace", async () => {
      const create = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Private Workspace",
        });

      expect(create.status).toBe(201);

      const workspaceId = create.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);

      expect(response.status).toBe(404);

      expect(response.body.error.code).toBe("WORKSPACE_NOT_FOUND");

      // Confirm the original owner still has the workspace.
      const check = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(check.status).toBe(200);
    });
  });
});
