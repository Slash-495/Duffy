import { getAIProvider } from "../ai/GrammarService.js";

const CEFR_GUIDANCE = {
  A1: "Use very short, simple sentences, high-frequency everyday words, and present tense.",
  A2: "Use simple connectors, everyday vocabulary, and clear past/present structures.",
  B1: "Use natural conversational phrasing with moderate idioms and varied tenses.",
  B2: "Use fluent, idiomatic phrasing suitable for workplace or social discussions.",
  C1: "Use nuanced, sophisticated vocabulary, subtle idioms, and complex sentence structures.",
  C2: "Speak at full native speed and complexity with cultural idioms and register shifts.",
};

export class RoleplayService {
  static async startScenario(userId, scenario, targetLanguage = "English", cefrLevel = "A2") {
    const provider = getAIProvider();
    const guidance = CEFR_GUIDANCE[cefrLevel] || CEFR_GUIDANCE.B1;

    const systemPrompt = `You are a native ${targetLanguage} speaker playing a role in a roleplay scenario.
Scenario: ${scenario}.
Learner CEFR proficiency: ${cefrLevel}. ${guidance}
Start the conversation briefly and naturally while staying strictly in character.`;

    const rawResponse = await provider.generateText("Start the scenario.", {
      systemPrompt,
      model: "gemini-2.5-flash",
    });
    return {
      message: rawResponse,
      role: "ai",
    };
  }

  /**
   * Processes the user's response and generates the next turn adapted to their CEFR level.
   */
  static async processTurn(
    userId,
    conversationHistory,
    targetLanguage = "English",
    cefrLevel = "B1",
    scenario = ""
  ) {
    const provider = getAIProvider();
    const normalizedCefr = String(cefrLevel || "B1").toUpperCase();
    const guidance =
      CEFR_GUIDANCE[normalizedCefr] ||
      `Match a ${cefrLevel} learner's vocabulary and grammar level.`;

    const systemPrompt = `You are continuing an immersive roleplay in ${targetLanguage}${
      scenario ? ` (Scenario: ${scenario})` : ""
    }.
Learner proficiency: ${cefrLevel}. ${guidance}
Respond naturally to the user's last message in ${targetLanguage}. Do not break character. Keep it concise (1-3 sentences).`;

    const historyText = (conversationHistory || [])
      .map((msg) => `${msg.role}: ${msg.text}`)
      .join("\n");

    const rawResponse = await provider.generateText(
      `History:\n${historyText}\n\nRespond to the last user message.`,
      { systemPrompt, model: "gemini-2.5-flash" }
    );
    return {
      message: rawResponse,
      role: "ai",
    };
  }
}
