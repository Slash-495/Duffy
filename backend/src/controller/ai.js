import { asyncHandler } from "../middleware/asyncHandler.js";
import { GrammarService } from "../services/ai/GrammarService.js";
import { VocabularyService, TranslationService, AnalyzerService } from "../services/ai/DomainServices.js";
import { getAIProvider } from "../services/ai/GrammarService.js";
import { PromptBuilder } from "../services/ai/PromptBuilder.js";

// @desc    Suggest grammar improvements
// @route   POST /api/ai/grammar
export const checkGrammar = asyncHandler(async (req, res) => {
  const { message, targetLanguage } = req.body;
  const result = await GrammarService.check(message, targetLanguage);
  res.status(200).json(result);
});

// @desc    Suggest vocabulary improvements
// @route   POST /api/ai/vocabulary
export const suggestVocabulary = asyncHandler(async (req, res) => {
  const { message, targetLanguage } = req.body;
  const result = await VocabularyService.suggest(message, targetLanguage);
  res.status(200).json(result);
});

// @desc    Translate message
// @route   POST /api/ai/translate
export const translateMessage = asyncHandler(async (req, res) => {
  const { message, sourceLanguage, targetLanguage } = req.body;
  const result = await TranslationService.translate(message, sourceLanguage, targetLanguage);
  res.status(200).json(result);
});

// @desc    Analyze conversation
// @route   POST /api/ai/analyze
export const analyzeConversation = asyncHandler(async (req, res) => {
  const { chatTranscript, targetLanguage } = req.body;
  const result = await AnalyzerService.analyzeConversation(chatTranscript, targetLanguage);
  res.status(200).json(result);
});

// @desc    Explain message via SSE stream
// @route   GET /api/ai/stream-explain
export const streamExplanation = asyncHandler(async (req, res) => {
  const { message, context } = req.query;

  // Standard SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const provider = getAIProvider();
  const { systemPrompt, userPrompt } = PromptBuilder.build("EXPLAIN_MESSAGE", { message, context: context || "" });

  try {
    const stream = provider.generateStream(userPrompt, { systemPrompt, model: "gemini-2.5-flash" });
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    res.write("data: [DONE]\n\n");
  } catch (error) {
    console.error("Streaming error:", error);
    res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
  } finally {
    res.end();
  }
});
