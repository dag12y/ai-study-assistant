import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";

import { create, list, get, update, remove } from "./workspace.controller.js";

import {
  listDocuments,
  uploadDocument,
} from "../documents/document.controller.js";
import { uploadDocument as uploadDocumentFile } from "../../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.post("/", create);
router.get("/", list);
router.get("/:workspaceId", get);
router.patch("/:workspaceId", update);
router.delete("/:workspaceId", remove);

router.get("/:workspaceId/documents", listDocuments);
router.post(
  "/:workspaceId/documents",
  uploadDocumentFile.single("file"),
  uploadDocument,
);

export default router;
