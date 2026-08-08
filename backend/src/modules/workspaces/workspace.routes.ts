import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";

import {
  create,
  list,
  get,
  update,
  remove,
} from "./workspace.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", create);
router.get("/", list);
router.get("/:workspaceId", get);
router.patch("/:workspaceId", update);
router.delete("/:workspaceId", remove);

export default router;