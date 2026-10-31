import { getAIProvider, parseJsonFromLLM } from "./GrammarService.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { buildCacheHashKey, cacheAside } from "../../lib/cache.js";

const AI_REPEATABLE_CACHE_TTL_SECONDS = 86_400; // 24 hours

export class VocabularyService {
  static async suggestWithCacheMeta(message, targetLanguage = "English") {
    const cacheKey = buildCacheHashKey("ai:vocab", {
      message,
      targetLanguage: String(targetLanguage || "English").toLowerCase(),
    });

    return cacheAside(cacheKey, AI_REPEATABLE_CACHE_TTL_SECONDS, async () => {
      const provider = getAIProvider();
      const { systemPrompt, userPrompt } = PromptBuilder.build("VOCABULARY", {
        message,
        targetLanguage,
      });

      const rawResponse = await provider.generateText(userPrompt, {
        systemPrompt,
        model: "gemini-2.5-flash",
      });

      return parseJsonFromLLM(rawResponse, "Vocabulary");
    });
  }

  static async suggest(message, targetLanguage = "English") {
    const { data } = await this.suggestWithCacheMeta(message, targetLanguage);
    return data;
  }
}

export class TranslationService {
  static async translateWithCacheMeta(
    message,
    sourceLanguage = "auto",
    targetLanguage = "English"
  ) {
    const cacheKey = buildCacheHashKey("ai:translate", {
      message,
      sourceLanguage: String(sourceLanguage || "auto").toLowerCase(),
      targetLanguage: String(targetLanguage || "English").toLowerCase(),
    });

    return cacheAside(cacheKey, AI_REPEATABLE_CACHE_TTL_SECONDS, async () => {
      const provider = getAIProvider();
      const { systemPrompt, userPrompt } = PromptBuilder.build("TRANSLATION", {
        message,
        sourceLanguage,
        targetLanguage,
      });

      const rawResponse = await provider.generateText(userPrompt, {
        systemPrompt,
        model: "gemini-2.5-flash",
      });

      return parseJsonFromLLM(rawResponse, "Translation");
    });
  }

  static async translate(message, sourceLanguage = "auto", targetLanguage = "English") {
    const { data } = await this.translateWithCacheMeta(
      message,
      sourceLanguage,
      targetLanguage
    );
    return data;
  }
}

export class AnalyzerService {
  static async analyzeConversation(chatTranscript, targetLanguage = "English") {
    const provider = getAIProvider();
    const { systemPrompt, userPrompt } = PromptBuilder.build("ANALYZE_CONVERSATION", {
      conversationHistory: chatTranscript,
      targetLanguage,
    });

    const rawResponse = await provider.generateText(userPrompt, {
      systemPrompt,
      model: "gemini-2.5-flash",
    });

    return parseJsonFromLLM(rawResponse, "Analyzer");
  }
}
