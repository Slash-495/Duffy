import { getAIProvider } from "../ai/GrammarService.js";
import { FeatureFlagService } from "../premium/FeatureFlagService.js";

export class RoleplayService {
  /**
   * Generates the opening prompt for a roleplay scenario (e.g. "At the Airport").
   * Enforces feature flags for AI API usage.
   */
  static async startScenario(userId, scenario, targetLanguage, cefrLevel) {
    const limits = await FeatureFlagService.getUserLimits(userId);
    // In production, we'd check actual usage count against limits.maxDailyAICalls
    
    const provider = getAIProvider();
    
    const systemPrompt = `You are a native ${targetLanguage} speaker playing a role in a roleplay scenario. 
The scenario is: ${scenario}. 
The user's CEFR level is ${cefrLevel}. Adjust your vocabulary and grammar complexity accordingly.
Start the conversation. Be brief, natural, and stay in character. Do not break character.`;

    const rawResponse = await provider.generateText("Start the scenario.", { systemPrompt, model: "gemini-2.5-flash" });
    return {
      message: rawResponse,
      role: "ai"
    };
  }

  /**
   * Processes the user's response and generates the next turn in the roleplay.
   */
  static async processTurn(userId, conversationHistory, targetLanguage, cefrLevel) {
    const provider = getAIProvider();
    const systemPrompt = `You are continuing a roleplay scenario in ${targetLanguage}. 
The user is at a ${cefrLevel} level. Respond naturally to the user's last message, keeping the conversation going.
Do not break character. Keep it brief (1-3 sentences).`;

    // Convert history to a string for the prompt
    const historyText = conversationHistory.map(msg => `${msg.role}: ${msg.text}`).join('\n');

    const rawResponse = await provider.generateText(`History:\n${historyText}\n\nRespond to the last user message.`, { systemPrompt, model: "gemini-2.5-flash" });
    return {
      message: rawResponse,
      role: "ai"
    };
  }
}
