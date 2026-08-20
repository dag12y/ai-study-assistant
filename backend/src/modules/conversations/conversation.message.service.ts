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
  // 1. Verify that the conversation belongs to the current user.
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

  // 2. Save the user's message.
  const [userMessage] = await db
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

  // 3. Run the existing RAG pipeline.
  const result = await generateRagAnswer(content, 5);

  // 4. Save the assistant's response.
  const [assistantMessage] = await db
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

  // 5. Save the document chunks used to generate the answer.
  if (result.sources.length > 0) {
    await db.insert(messageSources).values(
      result.sources.map((source) => ({
        messageId: assistantMessage.id,
        chunkId: source.chunkId,
        similarity: source.similarity,
      })),
    );
  }

  return {
    userMessage,
    assistantMessage,
    sources: result.sources,
  };
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
