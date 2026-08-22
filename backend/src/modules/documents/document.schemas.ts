import { z } from "zod";

export const createDocumentSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(255, "Title must not exceed 255 characters."),
});

export const documentIdSchema = z.object({
  documentId: z.string().uuid(),
});

export const listDocumentsQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
