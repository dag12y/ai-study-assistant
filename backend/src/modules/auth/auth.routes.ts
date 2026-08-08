import { Router } from "express";

import { register,login,me, refresh,logout } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate,me);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
