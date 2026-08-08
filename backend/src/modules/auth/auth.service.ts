import { eq } from "drizzle-orm";
import ms, { type StringValue } from "ms";
import { db } from "../../database/client.js";
import { users, refreshTokens } from "../../database/schema.js";
import { AppError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import type { RegisterUserInput, PublicUser } from "./auth.types.js";

import {
  generateAccessToken,
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  verifyRefreshTokenHash,
} from "./auth.utils.js";

import type {
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
} from "./auth.schemas.js";

export const registerUser = async (
  input: RegisterUserInput,
): Promise<PublicUser> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: "student",
    })
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  if (!user) {
    throw new AppError("Failed to create user.", 500, "USER_CREATION_FAILED");
  }

  return user;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const issueTokens = async (
  user: Pick<typeof users.$inferSelect, "id" | "role">,
): Promise<AuthTokens> => {
  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    sub: user.id,
  });

  const tokenHash = await hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (input: LoginInput) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  if (!user.isActive) {
    throw new AppError("This account is inactive.", 403, "ACCOUNT_INACTIVE");
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);

  if (!passwordValid) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
};

export const refreshSession = async (input: RefreshTokenInput) => {
  const payload = verifyRefreshToken(input.refreshToken);
  const sessions = await db.query.refreshTokens.findMany({
    where: eq(refreshTokens.userId, payload.sub),
  });
  if (sessions.length === 0) {
    throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
  }
  for (const session of sessions) {
    const valid = await verifyRefreshTokenHash(
      session.tokenHash,
      input.refreshToken,
    );

    if (!valid) {
      continue;
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, session.id));

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    return await issueTokens(user);
  }

  throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
};

export const logoutUser = async (input: LogoutInput): Promise<void> => {
  const payload = verifyRefreshToken(input.refreshToken);

  const sessions = await db.query.refreshTokens.findMany({
    where: eq(refreshTokens.userId, payload.sub),
  });

  for (const session of sessions) {
    const valid = await verifyRefreshTokenHash(
      session.tokenHash,
      input.refreshToken,
    );

    if (!valid) {
      continue;
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, session.id));

    return;
  }

  throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
};
