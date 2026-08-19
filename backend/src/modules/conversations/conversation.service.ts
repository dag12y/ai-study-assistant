import { and, desc, eq } from "drizzle-orm";

import { db } from "../../database/client.js";
import { conversations } from "../../database/schema.js";

export const createConversation = async (
  userId: string,
  workspaceId?: string,
  title = "New Conversation",
) => {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      workspaceId: workspaceId ?? null,
      title,
    })
    .returning();

  if (!conversation) {
    throw new Error("Failed to create conversation.");
  }

  return conversation;
};

export const listConversations = async (userId: string) => {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
};

export const getConversation = async (
  conversationId: string,
  userId: string,
) => {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);

  return conversation ?? null;
};

export const deleteConversation = async (
  conversationId: string,
  userId: string,
) => {
  const [deleted] = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .returning({
      id: conversations.id,
    });

  return deleted ?? null;
};
