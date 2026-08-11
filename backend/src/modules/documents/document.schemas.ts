import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(255, "Title must not exceed 255 characters."),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
