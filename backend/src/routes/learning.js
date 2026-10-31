import express from "express";
import {
  getLearningProfile,
  awardXP,
  getRoadmap,
  generateQuiz,
} from "../controller/learning.js";
import { protectRoute } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protectRoute);

router.get("/profile", getLearningProfile);
router.post("/xp", awardXP);
router.get("/roadmap", getRoadmap);
router.post("/quiz", aiLimiter, generateQuiz);

export default router;
