import express from "express";
import {
  getLearningProfile,
  awardXP,
  getRoadmap,
  generateQuiz
} from "../controller/learning.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute);

router.get("/profile", getLearningProfile);
router.post("/xp", awardXP);
router.get("/roadmap", getRoadmap);
router.post("/quiz", generateQuiz);

export default router;
