import type { Request, Response } from "express";

import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
} from "./conversation.service.js";

import {
  createConversationSchema,
  conversationIdSchema,
} from "./conversation.schemas.js";

export const createConversationController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user!.id;

  const input = createConversationSchema.parse(req.body);

  const conversation = await createConversation(
    userId,
    input.workspaceId,
    input.title,
  );

  res.status(201).json({
    conversation,
  });
};

export const listConversationsController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user!.id;

  const conversations = await listConversations(userId);

  res.status(200).json({
    conversations,
  });
};

export const getConversationController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user!.id;

  const { conversationId } = conversationIdSchema.parse(req.params);

  const conversation = await getConversation(conversationId, userId);

  if (!conversation) {
    res.status(404).json({
      message: "Conversation not found.",
    });
    return;
  }

  res.status(200).json({
    conversation,
  });
};

export const deleteConversationController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user!.id;

  const { conversationId } = conversationIdSchema.parse(req.params);

  const deleted = await deleteConversation(conversationId, userId);

  if (!deleted) {
    res.status(404).json({
      message: "Conversation not found.",
    });
    return;
  }

  res.status(204).send();
};
