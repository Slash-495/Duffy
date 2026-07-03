import { GeminiAdapter } from "./GeminiAdapter.js";
import { PromptBuilder } from "./PromptBuilder.js";

// Factory pattern to get the configured AI provider
export const getAIProvider = () => {
  // In the future, we can check process.env.AI_PROVIDER (e.g., 'gemini', 'openai')
  const apiKey = process.env.GEMINI_API_KEY; 
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }
  return new GeminiAdapter(apiKey);
};

export class GrammarService {
  static async check(message, targetLanguage) {
    const provider = getAIProvider();
    const { systemPrompt, userPrompt } = PromptBuilder.build("GRAMMAR", { message, targetLanguage });
    
    // Using gemini-2.5-flash since it's fast and reliable for JSON output
    const rawResponse = await provider.generateText(userPrompt, {
      systemPrompt,
      model: "gemini-2.5-flash" 
    });

    try {
      // Clean up markdown code blocks if the LLM wraps it in ```json
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Grammar response:", rawResponse);
      throw new Error("Invalid response format from AI.");
    }
  }
}
