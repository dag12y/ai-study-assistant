import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "../database/client.js";
import { users } from "../database/schema.js";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../modules/auth/auth.utils.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const authorization = req.header("Authorization");

    if (!authorization) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError("Invalid authorization header.", 401, "INVALID_TOKEN");
    }

    const payload = verifyAccessToken(token);

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new AppError("User not found.", 401, "INVALID_TOKEN");
    }

    if (!user.isActive) {
      throw new AppError("Account is inactive.", 403, "ACCOUNT_INACTIVE");
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
