import express from "express";
import {
  checkGrammar,
  suggestVocabulary,
  translateMessage,
  analyzeConversation,
  streamExplanation
} from "../controller/ai.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute);

router.post("/grammar", checkGrammar);
router.post("/vocabulary", suggestVocabulary);
router.post("/translate", translateMessage);
router.post("/analyze", analyzeConversation);
router.get("/stream-explain", streamExplanation);

export default router;
