import type { RequestHandler } from "express";

import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export const createRateLimiter = ({
  windowMs,
  max,
}: RateLimitOptions): RequestHandler => {
  const clients = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    if (env.NODE_ENV === "test") {
      next();
      return;
    }

    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const current = clients.get(key);

    if (!current || current.resetAt <= now) {
      clients.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      next(new AppError("Too many requests.", 429, "RATE_LIMIT_EXCEEDED"));
      return;
    }

    current.count += 1;
    next();
  };
};
