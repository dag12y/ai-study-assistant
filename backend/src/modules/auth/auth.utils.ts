import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";

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

export type AccessTokenPayload = {
  sub: string;
  role: "student" | "admin";
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
