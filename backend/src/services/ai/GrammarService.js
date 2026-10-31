import { GeminiAdapter } from "./GeminiAdapter.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { buildCacheHashKey, cacheAside } from "../../lib/cache.js";

const AI_REPEATABLE_CACHE_TTL_SECONDS = 86_400; // 24 hours

let cachedAdapter = null;
let cachedApiKey = null;

// Factory pattern returning a shared GeminiAdapter instance
export const getAIProvider = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }
  if (!cachedAdapter || cachedApiKey !== apiKey) {
    cachedAdapter = new GeminiAdapter(apiKey);
    cachedApiKey = apiKey;
  }
  return cachedAdapter;
};

export function parseJsonFromLLM(rawResponse, label) {
  try {
    const cleanJson = rawResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    console.error(`Failed to parse ${label} response from AI`);
    throw new Error("Invalid response format from AI.");
  }
}

export class GrammarService {
  static async checkWithCacheMeta(message, targetLanguage = "English") {
    const cacheKey = buildCacheHashKey("ai:grammar", {
      message,
      targetLanguage: String(targetLanguage || "English").toLowerCase(),
    });

    return cacheAside(cacheKey, AI_REPEATABLE_CACHE_TTL_SECONDS, async () => {
      const provider = getAIProvider();
      const { systemPrompt, userPrompt } = PromptBuilder.build("GRAMMAR", {
        message,
        targetLanguage,
      });

      const rawResponse = await provider.generateText(userPrompt, {
        systemPrompt,
        model: "gemini-2.5-flash",
      });

      return parseJsonFromLLM(rawResponse, "Grammar");
    });
  }

  static async check(message, targetLanguage = "English") {
    const { data } = await this.checkWithCacheMeta(message, targetLanguage);
    return data;
  }
}
