import Lesson from "../../models/Lesson.js";
import { cacheAside } from "../../lib/cache.js";

const ROADMAP_CACHE_TTL_SECONDS = 900; // 15 minutes

export class LearningEngine {
  /**
   * Fetches pre-seeded grammar lessons for a CEFR level using Redis cache-aside.
   */
  static async getRoadmapWithCacheMeta(cefrLevel = "A1") {
    const normalizedLevel = String(cefrLevel || "A1").toUpperCase();
    return cacheAside(
      `cache:roadmap:${normalizedLevel}`,
      ROADMAP_CACHE_TTL_SECONDS,
      async () => {
        return Lesson.find({ level: normalizedLevel, isPreSeeded: true }).lean();
      }
    );
  }

  static async getRoadmap(cefrLevel = "A1") {
    const { data } = await this.getRoadmapWithCacheMeta(cefrLevel);
    return data;
  }

  /**
   * Generates standard daily missions.
   */
  static generateDailyMissions() {
    return [
      { type: "flashcards", target: 20, progress: 0, description: "Review 20 Flashcards" },
      { type: "quiz", target: 1, progress: 0, description: "Complete 1 Grammar Quiz" },
      { type: "chat", target: 1, progress: 0, description: "Have a conversation with a partner" },
    ];
  }
}
