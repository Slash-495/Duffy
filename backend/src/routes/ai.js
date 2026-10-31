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
import { validateBody } from "../middleware/validate.js";
import {
  aiMessageSchema,
  aiAnalyzeSchema,
  aiPronunciationSchema,
  roleplayTurnSchema,
} from "../validators/schemas.js";

const router = express.Router();

router.use(protectRoute);
router.use(aiLimiter);

router.post("/grammar", validateBody(aiMessageSchema), checkGrammar);
router.post("/vocabulary", validateBody(aiMessageSchema), suggestVocabulary);
router.post("/translate", validateBody(aiMessageSchema), translateMessage);
router.post("/analyze", validateBody(aiAnalyzeSchema), analyzeConversation);
router.post("/pronunciation", validateBody(aiPronunciationSchema), evaluatePronunciation);
router.get("/stream-explain", streamExplanation);
router.post("/roleplay/turn", validateBody(roleplayTurnSchema), roleplayTurn);

export default router;
