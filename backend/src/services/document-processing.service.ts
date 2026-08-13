import { eq } from "drizzle-orm";

import { db } from "../database/client.js";
import { documentChunks, documents } from "../database/schema.js";
import { AppError } from "../lib/errors.js";
import { localStorageService } from "./local-storage.service.js";
import { extractPdfText } from "./pdf-extractor.service.js";
import { chunkDocument } from "./document-chunking.service.js";

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

  const pdfBuffer = await localStorageService.download(document.storageKey);

  const pages = await extractPdfText(pdfBuffer);

  const chunks = chunkDocument(pages);

  await db.insert(documentChunks).values(
    chunks.map((chunk) => ({
      documentId: document.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
    })),
  );

  return {
    document,
    pages,
    chunks,
  };
};
