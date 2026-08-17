import { generateDocumentEmbedding } from "./embedding.service.js";
import { searchSimilarChunks } from "./vector-search.service.js";
import { generateChatCompletion } from "./llm.service.js";

export const retrieveContext = async (question: string, limit = 5) => {
  const queryEmbedding = await generateDocumentEmbedding(question);

  const chunks = await searchSimilarChunks(queryEmbedding, limit);

  return chunks;
};

export const generateRagAnswer = async (question: string, limit = 5) => {
  const chunks = await retrieveContext(question, limit);

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
    {
      role: "user",
      content: `Context:

${context}

Question:
${question}`,
    },
  ]);

  return {
    answer,
    sources: chunks,
  };
};
