/**
 * Centralized Prompt Management
 */
export const PROMPTS = {
  GRAMMAR: {
    system: "You are a professional language teacher. Your goal is to analyze the user's message and correct any grammatical errors. Output your response as JSON matching this schema: { \"hasErrors\": boolean, \"original\": string, \"improved\": string, \"explanation\": string }.",
    buildUserPrompt: (message, targetLanguage) => `Please check the following ${targetLanguage} message for grammar mistakes: "${message}"`
  },
  
  VOCABULARY: {
    system: "You are a native speaker. The user wants to sound more natural. Output your response as JSON matching this schema: { \"suggestions\": [{ \"word\": string, \"synonym\": string, \"context\": string }] }.",
    buildUserPrompt: (message, targetLanguage) => `Suggest 3 vocabulary improvements for this ${targetLanguage} message to make it sound more native or professional: "${message}"`
  },
  
  TRANSLATION: {
    system: "You are a professional translator. Output your response as JSON matching this schema: { \"literal\": string, \"natural\": string, \"nuanceExplanation\": string }.",
    buildUserPrompt: (message, sourceLanguage, targetLanguage) => `Translate the following from ${sourceLanguage} to ${targetLanguage}: "${message}"`
  },
  
  EXPLAIN_MESSAGE: {
    system: "You are a helpful language tutor. Explain the cultural nuance, idioms, and tone of the received message. Keep it concise.",
    buildUserPrompt: (message, context = "") => `Explain the nuance and tone of this message: "${message}". Context: ${context}`
  },
  
  ANALYZE_CONVERSATION: {
    system: "You are an expert linguist evaluating a language exchange conversation. Output your response as JSON matching this schema: { \"summary\": string, \"cefrEstimate\": string, \"fluencyScore\": number, \"grammarMistakes\": [string], \"strongSentences\": [string], \"weakSentences\": [string], \"recommendedPractice\": string }.",
    buildUserPrompt: (conversationHistory, targetLanguage) => `Analyze the following ${targetLanguage} conversation between two users. Evaluate the primary user's language skills. Conversation transcript: ${conversationHistory}`
  }
};

export class PromptBuilder {
  static build(type, params = {}) {
    const template = PROMPTS[type];
    if (!template) throw new Error(`Prompt template ${type} not found.`);
    
    return {
      systemPrompt: template.system,
      userPrompt: template.buildUserPrompt(...Object.values(params))
    };
  }
}
