import type { RequestHandler } from "express";

import {
  createDocument,
  deleteDocument as deleteDocumentRecord,
  getDocumentForUser,
  getDocumentStatusForUser,
  listDocumentsForWorkspace,
} from "./document.service.js";
import { createDocumentSchema } from "./document.schemas.js";
import { processDocument } from "../../services/document-processing.service.js";

export const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    const documents = await listDocumentsForWorkspace(
      req.user!.id,
      req.params.workspaceId as string,
    );

    res.status(200).json({
      success: true,
      data: {
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument: RequestHandler = async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: "FILE_REQUIRED",
          message: "A PDF file is required.",
        },
      });
      return;
    }

    const document = await createDocument(
      req.params.workspaceId as string,
      req.user!.id,
      input,
      req.file,
    );

    void processDocument(document.id).catch((error) => {
      console.error(
        `Background processing failed for document ${document.id}:`,
        error,
      );
    });

    res.status(201).json({
      success: true,
      data: {
        document,
      },
      message: "Document uploaded successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument: RequestHandler = async (req, res, next) => {
  try {
    const document = await getDocumentForUser(
      req.user!.id,
      req.params.documentId as string,
    );

    res.status(200).json({
      success: true,
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentStatus: RequestHandler = async (req, res, next) => {
  try {
    const document = await getDocumentStatusForUser(
      req.user!.id,
      req.params.documentId as string,
    );

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    await deleteDocumentRecord(req.user!.id, req.params.documentId as string);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
