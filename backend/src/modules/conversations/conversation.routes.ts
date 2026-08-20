import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";

import {
  createConversationController,
  listConversationsController,
  getConversationController,
  deleteConversationController,
  createMessageController,
  listMessagesController,
} from "./conversation.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createConversationController);

router.get("/", listConversationsController);

router.get("/:conversationId", getConversationController);

router.delete("/:conversationId", deleteConversationController);

router.post("/:conversationId/messages", createMessageController);

router.get("/:conversationId/messages", listMessagesController);

export default router;
