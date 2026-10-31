import { asyncHandler } from "../middleware/asyncHandler.js";
import { GrammarService, getAIProvider } from "../services/ai/GrammarService.js";
import {
  VocabularyService,
  TranslationService,
  AnalyzerService,
} from "../services/ai/DomainServices.js";
import { PromptBuilder } from "../services/ai/PromptBuilder.js";
import { RoleplayService } from "../services/learning/RoleplayService.js";
import { VoiceAnalysisService } from "../services/learning/VoiceAnalysisService.js";
import { AnalyticsEngine } from "../services/learning/AnalyticsEngine.js";

// @desc    Suggest grammar improvements
// @route   POST /api/ai/grammar
export const checkGrammar = asyncHandler(async (req, res) => {
  const { message, targetLanguage } = req.body;
  const effectiveLang =
    targetLanguage ||
    (req.user?.learningLanguage !== "None" ? req.user?.learningLanguage : "English");

  const { data, hit } = await GrammarService.checkWithCacheMeta(message, effectiveLang);
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(data);
});

// @desc    Suggest vocabulary improvements
// @route   POST /api/ai/vocabulary
export const suggestVocabulary = asyncHandler(async (req, res) => {
  const { message, targetLanguage } = req.body;
  const effectiveLang =
    targetLanguage ||
    (req.user?.learningLanguage !== "None" ? req.user?.learningLanguage : "English");

  const { data, hit } = await VocabularyService.suggestWithCacheMeta(message, effectiveLang);
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(data);
});

// @desc    Translate message
// @route   POST /api/ai/translate
export const translateMessage = asyncHandler(async (req, res) => {
  const { message, sourceLanguage, targetLanguage } = req.body;
  const effectiveTarget = targetLanguage || req.user?.nativeLanguage || "English";

  const { data, hit } = await TranslationService.translateWithCacheMeta(
    message,
    sourceLanguage || "auto",
    effectiveTarget
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(data);
});

// @desc    Analyze conversation
// @route   POST /api/ai/analyze
export const analyzeConversation = asyncHandler(async (req, res) => {
  const { chatTranscript, targetLanguage } = req.body;
  const result = await AnalyzerService.analyzeConversation(chatTranscript, targetLanguage);
  res.status(200).json(result);
});

// @desc    Evaluate spoken pronunciation transcript
// @route   POST /api/ai/pronunciation
export const evaluatePronunciation = asyncHandler(async (req, res) => {
  const { transcript, targetLanguage, targetPhrase } = req.body;
  const effectiveLang =
    targetLanguage ||
    (req.user?.learningLanguage !== "None" ? req.user?.learningLanguage : "English");

  const { data, hit } = await VoiceAnalysisService.evaluateTranscriptWithCacheMeta(
    transcript,
    effectiveLang,
    targetPhrase
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(data);
});

// @desc    Explain message via SSE stream
// @route   GET /api/ai/stream-explain
export const streamExplanation = asyncHandler(async (req, res) => {
  const { message, context } = req.query;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const provider = getAIProvider();
  const { systemPrompt, userPrompt } = PromptBuilder.build("EXPLAIN_MESSAGE", {
    message,
    context: context || "",
  });

  try {
    const stream = provider.generateStream(userPrompt, {
      systemPrompt,
      model: "gemini-2.5-flash",
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
  } catch (error) {
    console.error("Streaming error:", error.message);
    res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
  } finally {
    res.end();
  }
});

// @desc    Process a roleplay conversation turn
// @route   POST /api/ai/roleplay/turn
export const roleplayTurn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { history, targetLanguage, cefrLevel, scenario } = req.body;

  let resolvedCefr = cefrLevel;
  if (!resolvedCefr) {
    const profile = await AnalyticsEngine.getProfile(userId);
    resolvedCefr = profile?.currentCEFR || "B1";
  }

  const resolvedLanguage =
    targetLanguage ||
    (req.user?.learningLanguage && req.user.learningLanguage !== "None"
      ? req.user.learningLanguage
      : "English");

  const response = await RoleplayService.processTurn(
    userId,
    history,
    resolvedLanguage,
    resolvedCefr,
    scenario
  );

  res.status(200).json(response);
});
