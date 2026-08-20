import type { Request, Response, RequestHandler } from "express";

import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
} from "./conversation.service.js";

import {
  createConversationSchema,
  conversationIdSchema,
  createConversationMessageSchema,
} from "./conversation.schemas.js";

import { createMessage, listMessages } from "./conversation.message.service.js";

import { AppError } from "../../lib/errors.js";

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

export const createMessageController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { conversationId } = conversationIdSchema.parse(req.params);

    const parsed = createConversationMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError("Invalid request body.", 400, "VALIDATION_ERROR");
    }

    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const result = await createMessage(
      conversationId,
      req.user.id,
      parsed.data.content,
    );

    res.status(201).json({
      message: result.assistantMessage,
      userMessage: result.userMessage,
      sources: result.sources,
    });
  } catch (error) {
    next(error);
  }
};

export const listMessagesController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { conversationId } = conversationIdSchema.parse(req.params);

    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const messages = await listMessages(conversationId, req.user.id);

    res.status(200).json({
      messages,
    });
  } catch (error) {
    next(error);
  }
};
