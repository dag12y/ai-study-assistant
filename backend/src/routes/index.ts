import { Router } from "express";

const router = Router();

router.get(
  "/health",
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        service: "ai-study-assistant-api",
      },
      message: "API is healthy",
    });
  }
);

export default router;