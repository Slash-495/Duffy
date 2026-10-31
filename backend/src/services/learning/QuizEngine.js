import { getAIProvider } from "../ai/GrammarService.js";
import { buildCacheHashKey, cacheAside } from "../../lib/cache.js";

const QUIZ_CACHE_TTL_SECONDS = 3600; // 1 hour

export class QuizEngine {
  /**
   * Dynamically generates a quiz based on a topic and target language,
   * caching repeatable topic+language combinations in Redis.
   */
  static async generateQuizWithCacheMeta(topic, targetLanguage = "English") {
    const cacheKey = buildCacheHashKey("ai:quiz", {
      topic: String(topic || "").toLowerCase(),
      targetLanguage: String(targetLanguage || "English").toLowerCase(),
    });

    return cacheAside(cacheKey, QUIZ_CACHE_TTL_SECONDS, async () => {
      const provider = getAIProvider();
      const systemPrompt = `You are a strict language teacher. Generate a 3-question quiz in ${targetLanguage} about ${topic}. Output valid JSON matching this schema exactly: { "questions": [ { "type": "mcq", "prompt": "string", "options": ["str1","str2","str3","str4"], "correctAnswer": "string", "explanation": "string" } ] }`;
      const userPrompt = `Create a quiz about ${topic}`;

      const rawResponse = await provider.generateText(userPrompt, {
        systemPrompt,
        model: "gemini-2.5-flash",
      });

      try {
        const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
      } catch {
        console.error("Failed to parse Quiz response");
        throw new Error("Invalid response format from AI.");
      }
    });
  }

  static async generateQuiz(topic, targetLanguage = "English") {
    const { data } = await this.generateQuizWithCacheMeta(topic, targetLanguage);
    return data;
  }
}
