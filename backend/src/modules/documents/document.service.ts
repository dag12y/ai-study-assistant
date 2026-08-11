import { and, desc, eq } from "drizzle-orm";

import { db } from "../../database/client.js";
import { documents, workspaces } from "../../database/schema.js";
import { AppError } from "../../lib/errors.js";
import type { CreateDocumentInput } from "./document.schemas.js";
import { localStorageService } from "../../services/local-storage.service.js";

type DocumentSummary = {
  id: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  status: typeof documents.$inferSelect.status;
  createdAt: Date;
};

type DocumentDetails = DocumentSummary & {
  workspaceId: string;
  uploadedBy: string;
  storageKey: string;
  errorMessage: string | null;
  updatedAt: Date;
};

const verifyWorkspaceOwnership = async (
  workspaceId: string,
  userId: string,
) => {
  const workspace = await db.query.workspaces.findFirst({
    where: and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)),
  });

  if (!workspace) {
    throw new AppError("Workspace not found.", 404, "WORKSPACE_NOT_FOUND");
  }

  return workspace;
};

const getOwnedDocument = async (userId: string, documentId: string) => {
  const [document] = await db
    .select({
      id: documents.id,
      workspaceId: documents.workspaceId,
      uploadedBy: documents.uploadedBy,
      title: documents.title,
      originalFilename: documents.originalFileName,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      storageKey: documents.storageKey,
      status: documents.status,
      errorMessage: documents.errorMessage,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .innerJoin(workspaces, eq(documents.workspaceId, workspaces.id))
    .where(and(eq(documents.id, documentId), eq(workspaces.ownerId, userId)))
    .limit(1);

  if (!document) {
    throw new AppError("Document not found.", 404, "DOCUMENT_NOT_FOUND");
  }

  return document as DocumentDetails;
};

const mapDocumentSummary = (document: DocumentDetails): DocumentSummary => ({
  id: document.id,
  title: document.title,
  originalFilename: document.originalFilename,
  mimeType: document.mimeType,
  fileSize: document.fileSize,
  status: document.status,
  createdAt: document.createdAt,
});

export const listDocumentsForWorkspace = async (
  userId: string,
  workspaceId: string,
) => {
  await verifyWorkspaceOwnership(workspaceId, userId);

  const workspaceDocuments = await db
    .select({
      id: documents.id,
      workspaceId: documents.workspaceId,
      uploadedBy: documents.uploadedBy,
      title: documents.title,
      originalFilename: documents.originalFileName,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      storageKey: documents.storageKey,
      status: documents.status,
      errorMessage: documents.errorMessage,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.workspaceId, workspaceId))
    .orderBy(desc(documents.createdAt));

  return workspaceDocuments.map(mapDocumentSummary);
};

export const getDocumentForUser = async (
  userId: string,
  documentId: string,
) => {
  const document = await getOwnedDocument(userId, documentId);

  return mapDocumentSummary(document);
};

export const getDocumentStatusForUser = async (
  userId: string,
  documentId: string,
) => {
  const document = await getOwnedDocument(userId, documentId);

  return {
    documentId: document.id,
    status: document.status,
  };
};

export const deleteDocument = async (
  userId: string,
  documentId: string,
): Promise<void> => {
  const document = await getOwnedDocument(userId, documentId);

  await localStorageService.delete(document.storageKey);

  const result = await db
    .delete(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, document.workspaceId),
      ),
    )
    .returning({
      id: documents.id,
    });

  if (result.length === 0) {
    throw new AppError("Document not found.", 404, "DOCUMENT_NOT_FOUND");
  }
};

type CreateDocumentFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export const createDocument = async (
  workspaceId: string,
  userId: string,
  input: CreateDocumentInput,
  file: CreateDocumentFile,
) => {
  await verifyWorkspaceOwnership(workspaceId, userId);

  const storageKey = await localStorageService.upload({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
  });

  try {
    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        uploadedBy: userId,
        title: input.title,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey,
        status: "uploaded",
      })
      .returning({
        id: documents.id,
        title: documents.title,
        status: documents.status,
      });

    if (!document) {
      throw new AppError(
        "Failed to create document.",
        500,
        "DOCUMENT_CREATION_FAILED",
      );
    }

    return document;
  } catch (error) {
    // Database insertion failed, so don't leave an orphaned file.
    await localStorageService.delete(storageKey);
    throw error;
  }
};
