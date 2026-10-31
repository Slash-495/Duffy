import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProviderAdapter } from "./ProviderAdapter.js";
import { AppError } from "../../lib/AppError.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12_000;
const DEFAULT_MAX_RETRIES =
  process.env.GEMINI_MAX_RETRIES !== undefined ? Number(process.env.GEMINI_MAX_RETRIES) : 2;
const BASE_BACKOFF_MS = 450;

export const AI_FALLBACK_MESSAGE =
  "The AI tutor is taking longer than usual to respond. Please try again in a few moments.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (!err) return false;
  if (err.code === "ETIMEDOUT" || err.name === "AbortError" || err.isTimeout) return true;

  const status = err.status || err.httpStatus || err.statusCode;
  if (status && [408, 429, 500, 502, 503, 504].includes(Number(status))) {
    return true;
  }

  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset")
  );
}

function withTimeout(promiseFactory, timeoutMs) {
  let timer = null;
  const controller = new AbortController();

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const timeoutErr = new Error(`Gemini request timed out after ${timeoutMs}ms`);
      timeoutErr.isTimeout = true;
      timeoutErr.code = "ETIMEDOUT";
      reject(timeoutErr);
    }, timeoutMs);
  });

  return Promise.race([promiseFactory(controller.signal), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Adapter for Google's Gemini SDK with per-call timeouts, exponential backoff retries,
 * and safe user-facing operational fallback errors.
 */
export class GeminiAdapter extends ProviderAdapter {
  constructor(apiKey) {
    super(apiKey);
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  _getModel(config) {
    const modelName = config.model || "gemini-2.5-flash";
    const modelConfig = { model: modelName };
    if (config.systemPrompt) {
      modelConfig.systemInstruction = config.systemPrompt;
    }
    return this.genAI.getGenerativeModel(modelConfig);
  }

  async generateText(prompt, config = {}) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const model = this._getModel(config);
    const generationConfig = {
      temperature: config.temperature ?? 0.7,
    };

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await withTimeout(
          (signal) =>
            model.generateContent(
              {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig,
              },
              { signal, timeout: timeoutMs }
            ),
          timeoutMs
        );
        return result.response.text();
      } catch (error) {
        lastError = error;
        const canRetry = attempt < maxRetries && isRetryableError(error);
        if (!canRetry) {
          break;
        }
        const backoffMs =
          BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn(
          `[GeminiAdapter] Attempt ${attempt + 1}/${maxRetries + 1} failed (${
            error.code || error.status || error.message
          }). Retrying in ${backoffMs}ms...`
        );
        await sleep(backoffMs);
      }
    }

    console.warn(`[GeminiAdapter] Request failed after retries: ${lastError?.message || "unknown"}`);
    throw new AppError(AI_FALLBACK_MESSAGE, 503, "AI_UNAVAILABLE");
  }

  async *generateStream(prompt, config = {}) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const model = this._getModel(config);
    const generationConfig = {
      temperature: config.temperature ?? 0.7,
    };

    let result = null;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await withTimeout(
          (signal) =>
            model.generateContentStream(
              {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig,
              },
              { signal, timeout: timeoutMs }
            ),
          timeoutMs
        );
        break;
      } catch (error) {
        lastError = error;
        const canRetry = attempt < maxRetries && isRetryableError(error);
        if (!canRetry) break;
        const backoffMs =
          BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(backoffMs);
      }
    }

    if (!result) {
      console.warn(`[GeminiAdapter] Stream failed after retries: ${lastError?.message || "unknown"}`);
      throw new AppError(AI_FALLBACK_MESSAGE, 503, "AI_UNAVAILABLE");
    }

    try {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (streamErr) {
      console.warn(`[GeminiAdapter] Mid-stream interruption: ${streamErr.message}`);
      throw new AppError(AI_FALLBACK_MESSAGE, 503, "AI_STREAM_INTERRUPTED");
    }
  }
}
