import { z } from "zod";

export const createConversationSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
