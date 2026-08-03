import { eq } from "drizzle-orm";

import { db } from "../../database/client.js";
import { users } from "../../database/schema.js";
import { AppError } from "../../lib/errors.js";

import { hashPassword } from "./auth.utils.js";

import type { RegisterUserInput, PublicUser } from "./auth.types.js";

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
