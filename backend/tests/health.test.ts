import { describe, expect, it } from "vitest";

import request from "supertest";

import app from "../src/app.js";

describe("API", () => {
  describe("GET /", () => {
    it("should return API information", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          service: "ai-study-assistant-api",
        },
        message: "Welcome to the AI Study Assistant API",
      });
    });
  });

  describe("GET /api/v1/health", () => {
    it("should return a healthy status", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: "ok",
          service: "ai-study-assistant-api",
        },
        message: "API is healthy",
      });
    });
  });

  describe("GET /api/v1/nonexistent", () => {
    it("should return a 404 error", async () => {
      const response = await request(app).get("/api/v1/nonexistent");

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route GET /api/v1/nonexistent not found",
        },
      });
    });
  });
});
