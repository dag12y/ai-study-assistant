import { z } from "zod";

export const createConversationSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

export const createConversationMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content is required.")
    .max(10_000, "Message is too long."),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
