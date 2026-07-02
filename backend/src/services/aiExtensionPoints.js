/**
 * AI Extension Points Stub
 * 
 * This file serves as the architecture interface for future Phase 3 AI features.
 * Controllers should call these stubs instead of writing LLM logic directly.
 */

export const aiService = {
  /**
   * Generates a complete flashcard data object given just a word/phrase.
   * Useful for "Save from Chat" to autofill fields.
   */
  generateCardData: async (word, languageContext) => {
    // TODO: Phase 3 implementation
    // Example: call OpenAI to get translation, part of speech, IPA, example sentence.
    console.warn("AI generateCardData called but not implemented yet.");
    return {
      word,
      translation: "AI Translation Stub",
      exampleSentence: "AI Example Stub",
    };
  },

  /**
   * Evaluates grammar on a user-submitted sentence.
   */
  checkGrammar: async (sentence) => {
    // TODO: Phase 3 implementation
    console.warn("AI checkGrammar called but not implemented yet.");
    return {
      isCorrect: true,
      suggestions: [],
    };
  },

  /**
   * Recommends tags based on card content to aid in search/filtering.
   */
  suggestTags: async (cardContent) => {
    // TODO: Phase 3 implementation
    return ["AI-Tag-Stub"];
  }
};
