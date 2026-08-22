import { sql } from "drizzle-orm";

import { db } from "../database/client.js";
import { documentChunks, documents, workspaces } from "../database/schema.js";

export type SimilarChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber: number;
  similarity: number;
};

export const searchSimilarChunks = async (
  queryEmbedding: number[],
  limit = 5,
  userId: string,
): Promise<SimilarChunk[]> => {
  const embedding = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute<{
    chunk_id: string;
    document_id: string;
    document_name: string;
    content: string;
    page_number: number;
    similarity: number;
  }>(sql`
    SELECT
      ${documentChunks.id} AS chunk_id,
      ${documentChunks.documentId} AS document_id,
      ${documents.title} AS document_name,
      ${documentChunks.content} AS content,
      ${documentChunks.pageNumber} AS page_number,
      1 - (${documentChunks.embedding} <=> ${embedding}::vector) AS similarity
    FROM ${documentChunks}
    INNER JOIN ${documents} ON ${documentChunks.documentId} = ${documents.id}
    INNER JOIN ${workspaces} ON ${documents.workspaceId} = ${workspaces.id}
    WHERE ${documentChunks.embedding} IS NOT NULL
      AND ${workspaces.ownerId} = ${userId}
    ORDER BY ${documentChunks.embedding} <=> ${embedding}::vector
    LIMIT ${limit}
  `);

  return results.rows.map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentName: row.document_name,
    content: row.content,
    pageNumber: row.page_number,
    similarity: Number(row.similarity),
  }));
};
