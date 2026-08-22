import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import workspaceRoutes from "../modules/workspaces/workspace.routes.js";
import documentRouter from "../modules/documents/document.routes.js";
import conversationRoutes from "../modules/conversations/conversation.routes.js";
import { uploadDocument as uploadDocumentFile } from "../middleware/upload.js";
import {
  listUserDocuments,
  uploadUserDocument,
} from "../modules/documents/document.controller.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { env } from "../config/env.js";

const router = Router();
const uploadRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_UPLOAD_MAX,
});

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "ai-study-assistant-api",
    },
    message: "API is healthy",
  });
});

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/documents", documentRouter);
router.get("/documents", listUserDocuments);
router.post(
  "/documents",
  uploadRateLimiter,
  uploadDocumentFile.single("file"),
  uploadUserDocument,
);
router.use("/conversations", conversationRoutes);

export default router;
