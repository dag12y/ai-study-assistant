import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";

import {
  createConversationController,
  listConversationsController,
  getConversationController,
  deleteConversationController,
} from "./conversation.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createConversationController);

router.get("/", listConversationsController);

router.get("/:conversationId", getConversationController);

router.delete("/:conversationId", deleteConversationController);

export default router;
