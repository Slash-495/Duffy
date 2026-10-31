import { getAIProvider, parseJsonFromLLM } from "../ai/GrammarService.js";
import { PromptBuilder } from "../ai/PromptBuilder.js";
import { buildCacheHashKey, cacheAside } from "../../lib/cache.js";

const PRONUNCIATION_CACHE_TTL_SECONDS = 86_400;

/**
 * Evaluates spoken Web Speech API transcripts using deterministic heuristics + Gemini coaching.
 * Note: Browser SpeechRecognition produces text transcripts rather than raw acoustic phonemes,
 * so scores reflect transcript accuracy/fluency and common pronunciation pitfalls.
 */
export class VoiceAnalysisService {
  static computeHeuristicBaseline(transcript, targetPhrase = "") {
    const clean = String(transcript || "").trim();
    if (!clean) {
      return {
        transcript: "",
        pronunciationScore: 0,
        fluencyScore: 0,
        mispronouncedWords: [],
        feedback: "No speech detected. Try speaking closer to the microphone.",
        evaluationMethod: "heuristic",
      };
    }

    const words = clean.split(/\s+/).filter(Boolean);
    const lengthFactor = Math.min(15, words.length * 2);
    let similarityScore = 80 + lengthFactor;

    if (targetPhrase.trim()) {
      const targetWords = targetPhrase.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/);
      const spokenSet = new Set(clean.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/));
      const matched = targetWords.filter((w) => spokenSet.has(w)).length;
      similarityScore = Math.round((matched / Math.max(1, targetWords.length)) * 100);
    }

    const clampedScore = Math.max(40, Math.min(98, similarityScore));
    return {
      transcript: clean,
      pronunciationScore: clampedScore,
      fluencyScore: Math.max(50, Math.min(98, clampedScore + 3)),
      mispronouncedWords: [],
      feedback: "Good clarity. Practice linking words smoothly at a natural pace.",
      evaluationMethod: "heuristic",
    };
  }

  static async evaluateTranscriptWithCacheMeta(
    transcript,
    targetLanguage = "English",
    targetPhrase = ""
  ) {
    const cleanTranscript = String(transcript || "").trim();
    if (!cleanTranscript) {
      return {
        data: this.computeHeuristicBaseline("", targetPhrase),
        hit: false,
      };
    }

    const cacheKey = buildCacheHashKey("ai:pronunciation", {
      transcript: cleanTranscript.toLowerCase(),
      targetLanguage: String(targetLanguage || "English").toLowerCase(),
      targetPhrase: String(targetPhrase || "").toLowerCase(),
    });

    return cacheAside(cacheKey, PRONUNCIATION_CACHE_TTL_SECONDS, async () => {
      try {
        const provider = getAIProvider();
        const { systemPrompt, userPrompt } = PromptBuilder.build("PRONUNCIATION_COACH", {
          transcript: cleanTranscript,
          targetPhrase,
          targetLanguage,
        });

        const rawResponse = await provider.generateText(userPrompt, {
          systemPrompt,
          model: "gemini-2.5-flash",
        });

        const parsed = parseJsonFromLLM(rawResponse, "Pronunciation");
        return {
          ...parsed,
          transcript: parsed.transcript || cleanTranscript,
          evaluationMethod: "web-speech-gemini-transcript",
        };
      } catch (err) {
        console.warn(`[VoiceAnalysisService] Falling back to heuristic scorer: ${err.message}`);
        return this.computeHeuristicBaseline(cleanTranscript, targetPhrase);
      }
    });
  }
}
