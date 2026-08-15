import { eq } from "drizzle-orm";

import { db } from "../database/client.js";
import { documentChunks, documents } from "../database/schema.js";
import { AppError } from "../lib/errors.js";
import { localStorageService } from "./local-storage.service.js";
import { extractPdfText } from "./pdf-extractor.service.js";
import { chunkDocument } from "./document-chunking.service.js";
import { generateDocumentEmbedding } from "./embedding.service.js";

export const processDocument = async (documentId: string) => {
  const [document] = await db
    .select({
      id: documents.id,
      storageKey: documents.storageKey,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document) {
    throw new AppError("Document not found.", 404, "DOCUMENT_NOT_FOUND");
  }

  await db
    .update(documents)
    .set({
      status: "processing",
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
  try {
    const pdfBuffer = await localStorageService.download(document.storageKey);

    const pages = await extractPdfText(pdfBuffer);

    const chunks = chunkDocument(pages);

    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await generateDocumentEmbedding(chunk.content);

        return {
          ...chunk,
          embedding,
        };
      }),
    );

    await db.insert(documentChunks).values(
      chunksWithEmbeddings.map((chunk) => ({
        documentId: document.id,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        embedding: chunk.embedding,
      })),
    );

    await db
      .update(documents)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return {
      document,
      pages,
      chunks,
    };
  } catch (error) {
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Document processing failed.",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    throw error;
  }
};
