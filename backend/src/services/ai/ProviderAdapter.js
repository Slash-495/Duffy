/**
 * Abstract Provider Adapter
 * This interface defines the contract that all AI provider adapters must implement.
 */
export class ProviderAdapter {
  /**
   * Initialize the provider with an API key.
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API Key is required to initialize AI Provider Adapter.");
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate a standard text response.
   * @param {string} prompt - The compiled prompt.
   * @param {object} config - Configuration options (temperature, systemPrompt, etc.)
   * @returns {Promise<string>} The generated text.
   */
  async generateText(prompt, config = {}) {
    throw new Error("generateText() must be implemented by subclass");
  }

  /**
   * Generate a streaming response.
   * @param {string} prompt - The compiled prompt.
   * @param {object} config - Configuration options.
   * @returns {AsyncGenerator<string, void, unknown>} A generator yielding chunks of text.
   */
  async *generateStream(prompt, config = {}) {
    throw new Error("generateStream() must be implemented by subclass");
  }
}
