// tests/conversation-message.test.ts

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import { users, conversations, messages } from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";

describe("Conversation Messages API", () => {
  let userId: string;
  let otherUserId: string;
  let conversationId: string;

  let accessToken: string;
  let otherAccessToken: string;

  const password = "StrongPassword123!";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email: `message-api-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Message API User",
        role: "student",
      })
      .returning({ id: users.id });

    if (!user) throw new Error("Failed to create test user.");

    userId = user.id;

    const [otherUser] = await db
      .insert(users)
      .values({
        email: `message-api-other-${Date.now()}@example.com`,
        passwordHash,
        fullName: "Other Message API User",
        role: "student",
      })
      .returning({ id: users.id });

    if (!otherUser) throw new Error("Failed to create second test user.");

    otherUserId = otherUser.id;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        title: "Message Test Conversation",
      })
      .returning({ id: conversations.id });

    if (!conversation) {
      throw new Error("Failed to create test conversation.");
    }

    conversationId = conversation.id;

    const [createdUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [createdOtherUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    if (!createdUser || !createdOtherUser) {
      throw new Error("Failed to retrieve test users.");
    }

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: createdUser.email,
        password,
      });

    expect(loginResponse.status).toBe(200);
    accessToken = loginResponse.body.data.accessToken;

    const otherLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: createdOtherUser.email,
        password,
      });

    expect(otherLoginResponse.status).toBe(200);
    otherAccessToken = otherLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));

    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId));

    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, otherUserId));

    await pool.end();
  });

  it("should reject unauthenticated access", async () => {
    const response = await request(app).get(
      `/api/v1/conversations/${conversationId}/messages`,
    );

    expect(response.status).toBe(401);
  });

  it("should reject invalid conversation ID", async () => {
    const response = await request(app)
      .get("/api/v1/conversations/not-a-uuid/messages")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it("should list messages for an empty conversation", async () => {
    const response = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toBeDefined();
    expect(Array.isArray(response.body.messages)).toBe(true);
    expect(response.body.messages).toHaveLength(0);
  });

  it("should reject another user's access", async () => {
    const response = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${otherAccessToken}`);

    expect(response.status).toBe(404);
  });

  it("should reject an empty message", async () => {
    const response = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        content: "",
      });

    expect(response.status).toBe(400);
  });

  it("should reject a missing message body", async () => {
    const response = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("should reject another user's message creation", async () => {
    const response = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${otherAccessToken}`)
      .send({
        content: "Hello",
      });

    expect(response.status).toBe(404);
  });

  it("should reject a nonexistent conversation", async () => {
    const response = await request(app)
      .get(
        "/api/v1/conversations/00000000-0000-0000-0000-000000000000/messages",
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});