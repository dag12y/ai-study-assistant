import argon2 from "argon2";
import crypto from "node:crypto";
import jwt, {
  JwtPayload,
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

export type AccessTokenPayload = {
  sub: string;
  role: "student" | "admin";
};

export type RefreshTokenPayload = {
  sub: string;
};

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
};

export const verifyPassword = async (
  passwordHash: string,
  password: string,
): Promise<boolean> => {
  return argon2.verify(passwordHash, password);
};

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as NonNullable<
        SignOptions["expiresIn"]
      >,
    },
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (
      typeof payload.sub !== "string" ||
      !z.string().uuid().safeParse(payload.sub).success ||
      (payload.role !== "student" && payload.role !== "admin")
    ) {
      throw new AppError("Invalid access token.", 401, "INVALID_TOKEN");
    }

    return {
      sub: payload.sub,
      role: payload.role,
    };
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError
    ) {
      throw new AppError(
        "Invalid or expired access token.",
        401,
        "INVALID_TOKEN",
      );
    }

    throw error;
  }
};

export const hashRefreshToken = async (token: string): Promise<string> => {
  return argon2.hash(token, {
    type: argon2.argon2id,
  });
};

export const verifyRefreshTokenHash = async (
  hash: string,
  token: string,
): Promise<boolean> => {
  return argon2.verify(hash, token);
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(
    {
      sub: payload.sub,
      jti: crypto.randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as NonNullable<
        SignOptions["expiresIn"]
      >,
    },
  );
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    if (
      typeof payload.sub !== "string" ||
      !z.string().uuid().safeParse(payload.sub).success
    ) {
      throw new AppError(
        "Invalid refresh token.",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    return {
      sub: payload.sub,
    };
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError
    ) {
      throw new AppError(
        "Invalid or expired refresh token.",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    throw error;
  }
};
