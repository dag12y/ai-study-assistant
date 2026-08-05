import { afterAll, beforeAll, describe, expect, it } from "vitest";

import request from "supertest";

import app from "../src/app.js";
import { db, pool } from "../src/database/client.js";
import { users } from "../src/database/schema.js";
import { hashPassword } from "../src/modules/auth/auth.utils.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

describe("Authentication", () => {
  const registerEmail = `register-${Date.now()}@example.com`;
  const authEmail = `auth-${Date.now()}@example.com`;
  const password = "StrongPassword123!";

  const seedUser = async (email: string, fullName: string) => {
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      email,
      passwordHash,
      fullName,
      role: "student",
    });
  };

  beforeAll(async () => {
    await pool.query(`DELETE FROM users WHERE email IN ($1, $2)`, [
      registerEmail,
      authEmail,
    ]);

    await seedUser(authEmail, "Auth User");
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email IN ($1, $2)`, [
      registerEmail,
      authEmail,
    ]);

    await pool.end();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: registerEmail,
        password,
        fullName: "Test User",
      });

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data.user).toMatchObject({
        email: registerEmail,
        fullName: "Test User",
        role: "student",
        isActive: true,
      });

      expect(response.body.data.user).not.toHaveProperty("password");

      expect(response.body.data.user).not.toHaveProperty("passwordHash");
    });

    it("should reject duplicate email", async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      await seedUser(duplicateEmail, "Seeded User");

      const response = await request(app).post("/api/v1/auth/register").send({
        email: duplicateEmail,
        password,
        fullName: "Another User",
      });

      expect(response.status).toBe(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
        },
      });
    });

    it("should reject invalid email", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "not-an-email",
        password: "StrongPassword123!",
        fullName: "Test User",
      });

      expect(response.status).toBe(400);
    });

    it("should reject a short password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `short-${Date.now()}@example.com`,
          password: "short",
          fullName: "Test User",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
        password,
      });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toHaveProperty("accessToken");

      const token = response.body.data.accessToken;
      expect(token).toEqual(expect.any(String));

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        role: string;
      };

      expect(payload.sub).toBeDefined();
      expect(payload.role).toBe("student");

      expect(response.body.data.user).toMatchObject({
        email: authEmail,
        fullName: "Auth User",
        role: "student",
        isActive: true,
      });

      expect(response.body.data.user).not.toHaveProperty("password");

      expect(response.body.data.user).not.toHaveProperty("passwordHash");
    });

    it("should reject an incorrect password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
        password: "WrongPassword123!",
      });

      expect(response.status).toBe(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
        },
      });
    });

    it("should reject an unknown email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "does-not-exist@example.com",
        password: "StrongPassword123!",
      });

      expect(response.status).toBe(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
        },
      });
    });

    it("should reject an invalid email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "not-an-email",
        password: "StrongPassword123!",
      });

      expect(response.status).toBe(400);
    });

    it("should reject a missing password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
      });

      expect(response.status).toBe(400);
    });

    it("should retrieve current user information", async () => {
      const login = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
        password,
      });

      const token = login.body.data.accessToken;

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data.email).toBe(authEmail);

      expect(response.body.data).not.toHaveProperty("passwordHash");
    });
    it("should reject requests without a token", async () => {
      const response = await request(app).get("/api/v1/auth/me");

      expect(response.status).toBe(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "UNAUTHORIZED",
        },
      });
    });
    it("should reject requests with an invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalidtoken");

      expect(response.status).toBe(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_TOKEN",
        },
      });
    });
    it("should reject requests  with invalid schema", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Basic abc123");

      expect(response.status).toBe(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_TOKEN",
        },
      });
    });
  });
});
