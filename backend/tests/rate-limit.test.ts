import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../src/config/env.js", () => ({
  env: { NODE_ENV: "production" },
}));

import { createRateLimiter } from "../src/middleware/rate-limit.js";

const request = {
  ip: "127.0.0.1",
  socket: { remoteAddress: "127.0.0.1" },
} as Request;

describe("Rate limiting", () => {
  it("rejects requests after the configured limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const next = vi.fn();
    const response = {
      setHeader: vi.fn(),
    } as unknown as Response;

    limiter(request, response, next);
    limiter(request, response, next);
    limiter(request, response, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(next.mock.calls[2]?.[0]).toMatchObject({
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED",
    });
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(Number));
  });
});
