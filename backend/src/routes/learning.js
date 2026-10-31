import express from "express";
import {
  getLearningProfile,
  awardXP,
  getRoadmap,
  generateQuiz,
} from "../controller/learning.js";
import { protectRoute } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { awardXPSchema, generateQuizSchema } from "../validators/schemas.js";

const router = express.Router();

router.use(protectRoute);

router.get("/profile", getLearningProfile);
router.post("/xp", validateBody(awardXPSchema), awardXP);
router.get("/roadmap", getRoadmap);
router.post("/quiz", aiLimiter, validateBody(generateQuizSchema), generateQuiz);

export default router;
