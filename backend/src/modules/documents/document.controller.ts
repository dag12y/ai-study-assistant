import type { RequestHandler } from "express";

import {
  createDocument,
  deleteDocument as deleteDocumentRecord,
  getDocumentForUser,
  getDocumentStatusForUser,
  listDocumentsForUser,
  listDocumentsForWorkspace,
} from "./document.service.js";
import {
  createDocumentSchema,
  documentIdSchema,
  listDocumentsQuerySchema,
} from "./document.schemas.js";
import { workspaceIdSchema } from "../workspaces/workspace.schemas.js";
import { processDocument } from "../../services/document-processing.service.js";

export const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { workspaceId } = workspaceIdSchema.parse(req.params);
    const documents = await listDocumentsForWorkspace(
      req.user!.id,
      workspaceId,
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

export const listUserDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { workspaceId } = listDocumentsQuerySchema.parse(req.query);
    const documents = await listDocumentsForUser(req.user!.id, workspaceId);

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument: RequestHandler = async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);
    const { workspaceId } = workspaceIdSchema.parse(req.params);

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
      workspaceId,
      req.user!.id,
      input,
      req.file,
    );

    void processDocument(document.id, req.user!.id).catch((error) => {
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

export const uploadUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);

    if (!input.workspaceId) {
      res.status(400).json({
        success: false,
        error: {
          code: "WORKSPACE_REQUIRED",
          message: "A workspace is required.",
        },
      });
      return;
    }

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
      input.workspaceId,
      req.user!.id,
      input,
      req.file,
    );

    void processDocument(document.id, req.user!.id).catch((error) => {
      console.error(
        `Background processing failed for document ${document.id}:`,
        error,
      );
    });

    res.status(201).json({
      success: true,
      data: { document },
      message: "Document uploaded successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = documentIdSchema.parse(req.params);
    const document = await getDocumentForUser(req.user!.id, documentId);

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
    const { documentId } = documentIdSchema.parse(req.params);
    const document = await getDocumentStatusForUser(req.user!.id, documentId);

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
    const { documentId } = documentIdSchema.parse(req.params);
    await deleteDocumentRecord(req.user!.id, documentId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
