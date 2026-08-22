import { generateDocumentEmbedding } from "./embedding.service.js";
import { searchSimilarChunks } from "./vector-search.service.js";
import { generateChatCompletion } from "./llm.service.js";
import { AppError } from "../lib/errors.js";

export type ConversationHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export const retrieveContext = async (
  userId: string,
  question: string,
  limit = 5,
) => {
  if (!question.trim()) {
    throw new AppError("Question is required.", 400, "QUESTION_REQUIRED");
  }

  const queryEmbedding = await generateDocumentEmbedding(question);

  const chunks = await searchSimilarChunks(queryEmbedding, limit, userId);

  return chunks;
};

export const generateRagAnswer = async (
  userId: string,
  question: string,
  limit = 5,
  history: ConversationHistoryMessage[] = [],
) => {
  const chunks = await retrieveContext(userId, question, limit);

  const context = chunks
    .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
    .join("\n\n");

  const answer = await generateChatCompletion([
    {
      role: "system",
      content: `You are an AI study assistant.

Answer the student's question using the provided document context.

Rules:
- Use the provided context as the primary source of truth.
- If the context does not contain enough information to answer, say that you don't have enough information.
- Do not invent facts.
- Give a clear and educational answer.
- When appropriate, explain the answer step by step.`,
    },
    ...history,
    {
      role: "user",
      content: `Retrieved document context:

${context || "No relevant document context was found."}

Current question:
${question}`,
    },
  ]);

  return {
    answer,
    sources: chunks,
  };
};
