import Lesson from "../../models/Lesson.js";

export class LearningEngine {
  /**
   * Generates a roadmap for the user. Since we are optimizing AI costs, 
   * we fetch the standard pre-seeded grammar lessons from the DB based on CEFR level.
   */
  static async getRoadmap(cefrLevel) {
    try {
      // Fetch pre-seeded lessons for this level
      const lessons = await Lesson.find({ level: cefrLevel, isPreSeeded: true });
      return lessons;
    } catch (error) {
      console.error("Error generating roadmap:", error);
      throw error;
    }
  }

  /**
   * Generates standard daily missions.
   */
  static generateDailyMissions() {
    return [
      { type: "flashcards", target: 20, description: "Review 20 Flashcards" },
      { type: "quiz", target: 1, description: "Complete 1 Grammar Quiz" },
      { type: "chat", target: 1, description: "Have a conversation with a partner" },
    ];
  }
}
