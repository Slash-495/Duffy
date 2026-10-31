import express from "express";
import { login, logout, signup, onboard, getMe } from "../controller/auth.js";
import { protectRoute } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import {
  signupSchema,
  loginSchema,
  onboardingSchema,
} from "../validators/schemas.js";

const router = express.Router();

router.post("/signup", authLimiter, validateBody(signupSchema), signup);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);

router.post("/onboarding", protectRoute, validateBody(onboardingSchema), onboard);
router.get("/me", protectRoute, getMe);

export default router;
