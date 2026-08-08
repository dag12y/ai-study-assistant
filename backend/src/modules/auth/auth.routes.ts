import { Router } from "express";

import { register,login,me, refresh } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate,me);
router.post("/refresh", refresh);

export default router;
