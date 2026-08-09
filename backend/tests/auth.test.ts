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
  const seededEmails = new Set<string>();

  const deleteUsersByEmail = async (emails: string[]) => {
    if (emails.length === 0) {
      return;
    }

    await pool.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [
      emails,
    ]);
  };

  const seedUser = async (email: string, fullName: string) => {
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      email,
      passwordHash,
      fullName,
      role: "student",
    });

    seededEmails.add(email);
  };

  beforeAll(async () => {
    await deleteUsersByEmail([registerEmail, authEmail]);

    await seedUser(authEmail, "Auth User");
  });

  afterAll(async () => {
    await deleteUsersByEmail([registerEmail, authEmail, ...seededEmails]);

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

  describe("POST /api/v1/auth/refresh", () => {
    it("should rotate refresh tokens and reject reuse of the old token", async () => {
      await pool.query(`DELETE FROM refresh_tokens`);

      const login = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
        password,
      });

      expect(login.status).toBe(200);

      const refreshToken1 = login.body.data.refreshToken;

      const firstRefresh = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: refreshToken1 });

      expect(firstRefresh.status).toBe(200);

      const refreshToken2 = firstRefresh.body.data.refreshToken;

      const reusedOldToken = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: refreshToken1 });

      expect(reusedOldToken.status).toBe(401);

      expect(reusedOldToken.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
        },
      });

      const secondRefresh = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: refreshToken2 });

      expect(secondRefresh.status).toBe(200);
      expect(secondRefresh.body.data).toHaveProperty("accessToken");
      expect(secondRefresh.body.data).toHaveProperty("refreshToken");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should invalidate the refresh token after logout", async () => {
      await pool.query(`DELETE FROM refresh_tokens`);

      const login = await request(app).post("/api/v1/auth/login").send({
        email: authEmail,
        password,
      });

      expect(login.status).toBe(200);

      const refreshToken = login.body.data.refreshToken;

      const logout = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken });

      expect(logout.status).toBe(200);
      expect(logout.body).toMatchObject({
        success: true,
        data: null,
      });

      const refreshAfterLogout = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken });

      expect(refreshAfterLogout.status).toBe(401);

      expect(refreshAfterLogout.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
        },
      });
    });
  });
});
