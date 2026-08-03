import { afterAll, beforeAll, describe, expect, it } from "vitest";

import request from "supertest";

import app from "../src/app.js";
import { pool } from "../src/database/client.js";

describe("Authentication", () => {
  const testEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-%@example.com'`);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [testEmail]);

    await pool.end();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: testEmail,
        password: "StrongPassword123!",
        fullName: "Test User",
      });

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data.user).toMatchObject({
        email: testEmail,
        fullName: "Test User",
        role: "student",
        isActive: true,
      });

      expect(response.body.data.user).not.toHaveProperty("password");

      expect(response.body.data.user).not.toHaveProperty("passwordHash");
    });

    it("should reject duplicate email", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: testEmail,
        password: "StrongPassword123!",
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
});
