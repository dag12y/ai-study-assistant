import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import workspaceRoutes from "../modules/workspaces/workspace.routes.js";
import documentRouter from "../modules/documents/document.routes.js";
import conversationRoutes from "../modules/conversations/conversation.routes.js";

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

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/documents", documentRouter);
router.use("/conversations", conversationRoutes);


export default router;