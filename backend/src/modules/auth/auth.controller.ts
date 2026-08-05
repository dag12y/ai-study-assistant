import type { RequestHandler } from "express";

import { loginSchema, registerSchema } from "./auth.schemas.js";

import { loginUser, registerUser,getCurrentUser } from "./auth.service.js";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const user = await registerUser(input);

    res.status(201).json({
      success: true,
      data: {
        user,
      },
      message: "Account created successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await loginUser(input);

    res.status(200).json({
      success: true,
      data: result,
      message: "Login successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user!.id);

    res.status(200).json({
      success: true,
      data: user,
      message: "User retrieved successfully.",
    });
  } catch (error) {
    next(error);
  }
};
