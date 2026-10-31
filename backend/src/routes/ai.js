import express from "express";
import {
  checkGrammar,
  suggestVocabulary,
  translateMessage,
  analyzeConversation,
  evaluatePronunciation,
  streamExplanation,
  roleplayTurn,
} from "../controller/ai.js";
import { protectRoute } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protectRoute);
router.use(aiLimiter);

router.post("/grammar", checkGrammar);
router.post("/vocabulary", suggestVocabulary);
router.post("/translate", translateMessage);
router.post("/analyze", analyzeConversation);
router.post("/pronunciation", evaluatePronunciation);
router.get("/stream-explain", streamExplanation);
router.post("/roleplay/turn", roleplayTurn);

export default router;
