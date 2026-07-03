import { getAIProvider } from "./GrammarService.js";
import { PromptBuilder } from "./PromptBuilder.js";

export class VocabularyService {
  static async suggest(message, targetLanguage) {
    const provider = getAIProvider();
    const { systemPrompt, userPrompt } = PromptBuilder.build("VOCABULARY", { message, targetLanguage });
    
    const rawResponse = await provider.generateText(userPrompt, { systemPrompt, model: "gemini-2.5-flash" });

    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Vocabulary response:", rawResponse);
      throw new Error("Invalid response format from AI.");
    }
  }
}

export class TranslationService {
  static async translate(message, sourceLanguage, targetLanguage) {
    const provider = getAIProvider();
    const { systemPrompt, userPrompt } = PromptBuilder.build("TRANSLATION", { message, sourceLanguage, targetLanguage });
    
    const rawResponse = await provider.generateText(userPrompt, { systemPrompt, model: "gemini-2.5-flash" });

    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Translation response:", rawResponse);
      throw new Error("Invalid response format from AI.");
    }
  }
}

export class AnalyzerService {
  static async analyzeConversation(chatTranscript, targetLanguage) {
    const provider = getAIProvider();
    const { systemPrompt, userPrompt } = PromptBuilder.build("ANALYZE_CONVERSATION", { conversationHistory: chatTranscript, targetLanguage });
    
    // For analysis, we might use the pro model if the transcript is long, but flash is good enough.
    const rawResponse = await provider.generateText(userPrompt, { systemPrompt, model: "gemini-2.5-flash" });

    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Analyzer response:", rawResponse);
      throw new Error("Invalid response format from AI.");
    }
  }
}
