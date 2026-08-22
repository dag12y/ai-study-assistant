import { Router } from "express";

import { register,login,me, refresh,logout } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { env } from "../../config/env.js";

const authRateLimiter = createRateLimiter({
	windowMs: env.RATE_LIMIT_WINDOW_MS,
	max: env.RATE_LIMIT_AUTH_MAX,
});

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", authenticate,me);
router.post("/refresh", authRateLimiter, refresh);
router.post("/logout", authRateLimiter, logout);

export default router;
