import type { RequestHandler } from "express";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  logoutSchema,
} from "./auth.schemas.js";

import {
  loginUser,
  registerUser,
  getCurrentUser,
  refreshSession,
  logoutUser,
} from "./auth.service.js";

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

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const input = refreshTokenSchema.parse(req.body);

    const tokens = await refreshSession(input);

    res.status(200).json({
      success: true,
      data: tokens,
      message: "Tokens refreshed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const input = logoutSchema.parse(req.body);

    await logoutUser(input);

    res.status(200).json({
      success: true,
      data: null,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};
