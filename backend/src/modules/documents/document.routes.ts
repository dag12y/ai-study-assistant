import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import {
  deleteDocument,
  getDocument,
  getDocumentStatus,
} from "./document.controller.js";

const router = Router();

router.use(authenticate);
router.get("/:documentId/status", getDocumentStatus);
router.get("/:documentId", getDocument);
router.delete("/:documentId", deleteDocument);

export default router;
