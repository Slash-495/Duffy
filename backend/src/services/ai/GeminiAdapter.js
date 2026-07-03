import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProviderAdapter } from "./ProviderAdapter.js";

/**
 * Adapter for Google's Gemini SDK
 */
export class GeminiAdapter extends ProviderAdapter {
  constructor(apiKey) {
    super(apiKey);
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  _getModel(config) {
    // Default to gemini-2.5-flash for speed, unless specified
    const modelName = config.model || "gemini-2.5-flash";
    
    const modelConfig = { model: modelName };
    if (config.systemPrompt) {
      modelConfig.systemInstruction = config.systemPrompt;
    }

    return this.genAI.getGenerativeModel(modelConfig);
  }

  async generateText(prompt, config = {}) {
    try {
      const model = this._getModel(config);
      const generationConfig = {
        temperature: config.temperature ?? 0.7,
      };
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
      return result.response.text();
    } catch (error) {
      console.error("GeminiAdapter generateText Error:", error);
      throw new Error("Failed to generate response from Gemini.");
    }
  }

  async *generateStream(prompt, config = {}) {
    try {
      const model = this._getModel(config);
      const generationConfig = {
        temperature: config.temperature ?? 0.7,
      };

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error("GeminiAdapter generateStream Error:", error);
      throw new Error("Failed to generate stream from Gemini.");
    }
  }
}
