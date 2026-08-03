import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";

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

router.use('/auth', authRoutes);

export default router;