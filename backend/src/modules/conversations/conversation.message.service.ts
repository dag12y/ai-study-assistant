import { and, asc, eq } from "drizzle-orm";

import { db } from "../../database/client.js";
import {
  conversations,
  messageSources,
  messages,
} from "../../database/schema.js";

import { AppError } from "../../lib/errors.js";
import { generateRagAnswer } from "../../services/rag.service.js";

export const createMessage = async (
  conversationId: string,
  userId: string,
  content: string,
) => {
  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .select({
        id: conversations.id,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new AppError(
        "Conversation not found.",
        404,
        "CONVERSATION_NOT_FOUND",
      );
    }

    const [userMessage] = await tx
      .insert(messages)
      .values({
        conversationId,
        role: "user",
        content,
      })
      .returning();

    if (!userMessage) {
      throw new Error("Failed to create user message.");
    }

    const result = await generateRagAnswer(content, 5);

    const [assistantMessage] = await tx
      .insert(messages)
      .values({
        conversationId,
        role: "assistant",
        content: result.answer,
        model: "rag",
      })
      .returning();

    if (!assistantMessage) {
      throw new Error("Failed to create assistant message.");
    }

    if (result.sources.length > 0) {
      await tx.insert(messageSources).values(
        result.sources.map((source) => ({
          messageId: assistantMessage.id,
          chunkId: source.chunkId,
          similarity: source.similarity,
        })),
      );
    }

    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return {
      userMessage,
      assistantMessage,
      sources: result.sources,
    };
  });
};

export const listMessages = async (conversationId: string, userId: string) => {
  // Verify that the conversation belongs to the current user.
  const [conversation] = await db
    .select({
      id: conversations.id,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new AppError(
      "Conversation not found.",
      404,
      "CONVERSATION_NOT_FOUND",
    );
  }

  // Return messages in chronological order.
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
};
