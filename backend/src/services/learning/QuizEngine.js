import { getAIProvider } from "../ai/GrammarService.js";

export class QuizEngine {
  /**
   * Dynamically generates a quiz based on a topic or weak areas.
   */
  static async generateQuiz(topic, targetLanguage) {
    const provider = getAIProvider();
    const systemPrompt = `You are a strict language teacher. Generate a 3-question quiz in ${targetLanguage} about ${topic}. Output valid JSON matching this schema exactly: { "questions": [ { "type": "mcq", "prompt": "string", "options": ["str1","str2","str3","str4"], "correctAnswer": "string", "explanation": "string" } ] }`;
    const userPrompt = `Create a quiz about ${topic}`;
    
    const rawResponse = await provider.generateText(userPrompt, { systemPrompt, model: "gemini-2.5-flash" });
    
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Quiz response:", rawResponse);
      throw new Error("Invalid response format from AI.");
    }
  }
}
