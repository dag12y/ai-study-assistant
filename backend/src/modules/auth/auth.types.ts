import type { RegisterInput } from "./auth.schemas.js";

export type RegisterUserInput = RegisterInput;

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: "student" | "admin";
  isActive: boolean;
  createdAt: Date;
};
