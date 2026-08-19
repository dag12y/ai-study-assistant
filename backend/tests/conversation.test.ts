import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import { users, workspaces, conversations } from "../src/database/schema.js";

import { hashPassword } from "../src/modules/auth/auth.utils.js";

describe("Conversations API", () => {
  let userId: string;
  let otherUserId: string;

  let workspaceId: string;

  let accessToken: string;
  let otherAccessToken: string;

  let conversationId: string;
  let workspaceConversationId: string;

  const password = "StrongPassword123!";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email: `conversation-api-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Conversation API User",
        role: "student",
      })
      .returning({
        id: users.id,
      });

    if (!user) {
      throw new Error("Failed to create test user.");
    }

    userId = user.id;

    const [otherUser] = await db
      .insert(users)
      .values({
        email: `conversation-api-other-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Other Conversation API User",
        role: "student",
      })
      .returning({
        id: users.id,
      });

    if (!otherUser) {
      throw new Error("Failed to create second test user.");
    }

    otherUserId = otherUser.id;

    const [workspace] = await db
      .insert(workspaces)
      .values({
        ownerId: userId,
        name: "Conversation API Workspace",
      })
      .returning({
        id: workspaces.id,
      });

    if (!workspace) {
      throw new Error("Failed to create test workspace.");
    }

    workspaceId = workspace.id;

    // Login first user
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `conversation-api-${Date.now() - 0}@example.com`,
        password,
      });

    // We don't want to depend on reconstructing the timestamp above.
    // Instead, query the email directly.
    const [createdUser] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!createdUser) {
      throw new Error("Failed to retrieve created user.");
    }

    const actualLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: createdUser.email,
        password,
      });

    expect(actualLoginResponse.status).toBe(200);

    accessToken = actualLoginResponse.body.data.accessToken;

    const [createdOtherUser] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    if (!createdOtherUser) {
      throw new Error("Failed to retrieve second user.");
    }

    const otherLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: createdOtherUser.email,
        password,
      });

    expect(otherLoginResponse.status).toBe(200);

    otherAccessToken = otherLoginResponse.body.data.accessToken;

    // Avoid unused variable warning from the initial request.
    void loginResponse;
  });

  afterAll(async () => {
    // Delete conversations first.
    if (conversationId) {
      await db
        .delete(conversations)
        .where(eq(conversations.id, conversationId));
    }

    if (workspaceConversationId) {
      await db
        .delete(conversations)
        .where(eq(conversations.id, workspaceConversationId));
    }

    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }

    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }

    if (otherUserId) {
      await db.delete(users).where(eq(users.id, otherUserId));
    }

    await pool.end();
  });

  it("should create a personal conversation without a workspace", async () => {
    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Personal Study Session",
      });

    expect(response.status).toBe(201);

    expect(response.body.conversation).toBeDefined();

    expect(response.body.conversation.userId).toBe(userId);

    expect(response.body.conversation.workspaceId).toBeNull();

    expect(response.body.conversation.title).toBe("Personal Study Session");

    conversationId = response.body.conversation.id;
  });

  it("should create a workspace conversation", async () => {
    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        workspaceId,
        title: "Workspace Study Session",
      });

    expect(response.status).toBe(201);

    expect(response.body.conversation).toBeDefined();

    expect(response.body.conversation.userId).toBe(userId);

    expect(response.body.conversation.workspaceId).toBe(workspaceId);

    expect(response.body.conversation.title).toBe("Workspace Study Session");

    workspaceConversationId = response.body.conversation.id;
  });

  it("should create a conversation with the default title", async () => {
    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(201);

    expect(response.body.conversation.title).toBe("New Conversation");

    expect(response.body.conversation.workspaceId).toBeNull();

    const id = response.body.conversation.id;

    await db.delete(conversations).where(eq(conversations.id, id));
  });

  it("should list the user's conversations", async () => {
    const response = await request(app)
      .get("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.conversations).toBeDefined();

    expect(Array.isArray(response.body.conversations)).toBe(true);

    expect(response.body.conversations.length).toBeGreaterThanOrEqual(2);

    expect(
      response.body.conversations.every(
        (conversation: { userId: string }) => conversation.userId === userId,
      ),
    ).toBe(true);
  });

  it("should get a conversation", async () => {
    const response = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.conversation.id).toBe(conversationId);

    expect(response.body.conversation.userId).toBe(userId);
  });

  it("should reject unauthenticated access", async () => {
    const response = await request(app).get("/api/v1/conversations");

    expect(response.status).toBe(401);
  });

  it("should prevent another user from accessing the conversation", async () => {
    const response = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${otherAccessToken}`);

    expect(response.status).toBe(404);
  });

  it("should prevent another user from deleting the conversation", async () => {
    const response = await request(app)
      .delete(`/api/v1/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${otherAccessToken}`);

    expect(response.status).toBe(404);
  });

  it("should reject an invalid conversation ID", async () => {
    const response = await request(app)
      .get("/api/v1/conversations/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it("should reject an invalid workspace ID", async () => {
    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        workspaceId: "not-a-uuid",
        title: "Invalid Workspace",
      });

    expect(response.status).toBe(400);
  });

  it("should reject an empty title", async () => {
    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "",
      });

    expect(response.status).toBe(400);
  });

  it("should delete the conversation", async () => {
    const response = await request(app)
      .delete(`/api/v1/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(204);

    const getResponse = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(404);

    conversationId = "";
  });

  it("should return 404 when deleting a nonexistent conversation", async () => {
    const response = await request(app)
      .delete("/api/v1/conversations/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});