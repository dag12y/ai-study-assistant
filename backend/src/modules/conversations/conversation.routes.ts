import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { env } from "../../config/env.js";

import {
  createConversationController,
  listConversationsController,
  getConversationController,
  deleteConversationController,
  createMessageController,
  listMessagesController,
} from "./conversation.controller.js";

const router = Router();
const messageRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AI_MAX,
});

router.use(authenticate);

router.post("/", createConversationController);

router.get("/", listConversationsController);

router.get("/:conversationId", getConversationController);

router.delete("/:conversationId", deleteConversationController);

router.post(
  "/:conversationId/messages",
  messageRateLimiter,
  createMessageController,
);

router.get("/:conversationId/messages", listMessagesController);

export default router;
