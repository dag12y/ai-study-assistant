import { CohereClientV2 } from "cohere-ai";

import { env } from "../config/env.js";

const cohere = new CohereClientV2({
  token: env.COHERE_API_KEY,
});

const EMBEDDING_MODEL = "embed-v4.0";
const EMBEDDING_DIMENSIONS = 512;

export const generateDocumentEmbedding = async (
  text: string,
): Promise<number[]> => {
  const response = await cohere.embed({
    model: EMBEDDING_MODEL,
    inputType: "search_document",
    texts: [text],
    outputDimension: EMBEDDING_DIMENSIONS,
    embeddingTypes: ["float"],
  });

  const embedding = response.embeddings?.float?.[0];

  if (!embedding) {
    throw new Error("Cohere returned no embedding.");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dimensional embedding, got ${embedding.length}.`,
    );
  }

  return embedding;
};
