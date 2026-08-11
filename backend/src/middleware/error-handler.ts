import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";

import { ZodError } from "zod";

import { AppError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: "The uploaded file exceeds the allowed size.",
      },
    });

    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data.",
        details: error.flatten().fieldErrors,
      },
    });

    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};
