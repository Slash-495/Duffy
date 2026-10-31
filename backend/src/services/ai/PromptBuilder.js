/**
 * Centralized Prompt Management
 */
export const PROMPTS = {
  GRAMMAR: {
    system:
      'You are a professional language teacher. Analyze the user\'s message and correct any grammatical errors. Output your response as JSON matching this schema: { "hasErrors": boolean, "original": string, "improved": string, "explanation": string }.',
    buildUserPrompt: ({ message, targetLanguage }) =>
      `Please check the following ${targetLanguage || "English"} message for grammar mistakes: "${message}"`,
  },

  VOCABULARY: {
    system:
      'You are a native speaker helping a learner sound natural. Output your response as JSON matching this schema: { "suggestions": [{ "word": string, "synonym": string, "context": string }] }.',
    buildUserPrompt: ({ message, targetLanguage }) =>
      `Suggest 3 vocabulary improvements for this ${targetLanguage || "English"} message to make it sound more native or professional: "${message}"`,
  },

  TRANSLATION: {
    system:
      'You are a professional translator. Output your response as JSON matching this schema: { "literal": string, "natural": string, "nuanceExplanation": string }.',
    buildUserPrompt: ({ message, sourceLanguage = "auto-detected language", targetLanguage }) =>
      `Translate the following from ${sourceLanguage || "auto-detected language"} to ${targetLanguage || "English"}: "${message}"`,
  },

  EXPLAIN_MESSAGE: {
    system:
      "You are a helpful language tutor. Explain the cultural nuance, idioms, and tone of the received message. Keep it concise.",
    buildUserPrompt: ({ message, context = "" }) =>
      `Explain the nuance and tone of this message: "${message}". Context: ${context}`,
  },

  ANALYZE_CONVERSATION: {
    system:
      'You are an expert linguist evaluating a language exchange conversation. Output your response as JSON matching this schema: { "summary": string, "cefrEstimate": string, "fluencyScore": number, "grammarMistakes": [string], "strongSentences": [string], "weakSentences": [string], "recommendedPractice": string }.',
    buildUserPrompt: ({ conversationHistory, targetLanguage }) =>
      `Analyze the following ${targetLanguage || "English"} conversation between two users. Evaluate the primary user's language skills. Conversation transcript: ${conversationHistory}`,
  },

  PRONUNCIATION_COACH: {
    system:
      'You are a speech and pronunciation coach evaluating a browser speech-to-text transcript (note: evaluate phrasing, likely phonetic pitfalls for learners, and fluency from text). Output valid JSON matching this schema: { "transcript": string, "pronunciationScore": number, "fluencyScore": number, "mispronouncedWords": [{ "word": string, "expectedPhoneme": string, "userPhoneme": string }], "feedback": string }.',
    buildUserPrompt: ({ transcript, targetPhrase = "", targetLanguage = "English" }) =>
      `Evaluate this spoken ${targetLanguage} transcript: "${transcript}".${
        targetPhrase ? ` Intended phrase: "${targetPhrase}".` : ""
      } Identify up to 2 challenging words with simplified phonetic guidance.`,
  },
};

export class PromptBuilder {
  static build(type, params = {}) {
    const template = PROMPTS[type];
    if (!template) throw new Error(`Prompt template ${type} not found.`);

    return {
      systemPrompt: template.system,
      userPrompt: template.buildUserPrompt(params),
    };
  }
}
