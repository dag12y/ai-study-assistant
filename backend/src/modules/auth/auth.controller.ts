import type { RequestHandler } from "express";

import { registerSchema } from "./auth.schemas.js";

import { registerUser } from "./auth.service.js";

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
