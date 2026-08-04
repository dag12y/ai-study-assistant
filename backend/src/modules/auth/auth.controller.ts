import type { RequestHandler } from "express";

import { loginSchema, registerSchema } from "./auth.schemas.js";

import { loginUser, registerUser } from "./auth.service.js";

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

export const login: RequestHandler =
  async (req, res, next) => {
    try {
      const input =
        loginSchema.parse(req.body);

      const result =
        await loginUser(input);

      res.status(200).json({
        success: true,
        data: result,
        message:
          "Login successful.",
      });
    } catch (error) {
      next(error);
    }
  };
