import LearningProfile from "../../models/LearningProfile.js";

export class AnalyticsEngine {
  /**
   * Awards XP to a user and updates their streak if applicable.
   * Ensures XP is strictly tracked per day for streaks as requested.
   */
  static async awardXP(userId, amount) {
    try {
      let profile = await LearningProfile.findOne({ userId });
      
      if (!profile) {
        profile = new LearningProfile({ userId });
      }

      profile.xp += amount;

      const now = new Date();
      const lastActive = profile.lastActiveDate;

      if (!lastActive) {
        // First time earning XP
        profile.currentStreak = 1;
        profile.longestStreak = 1;
      } else {
        const diffTime = Math.abs(now - lastActive);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          profile.currentStreak += 1;
          if (profile.currentStreak > profile.longestStreak) {
            profile.longestStreak = profile.currentStreak;
          }
        } else if (diffDays > 1) {
          // Streak broken
          profile.currentStreak = 1;
        }
      }

      profile.lastActiveDate = now;
      await profile.save();

      return {
        xp: profile.xp,
        currentStreak: profile.currentStreak,
        awarded: amount,
      };
    } catch (error) {
      console.error("Error in awardXP:", error);
      throw error;
    }
  }

  static async getProfile(userId) {
    let profile = await LearningProfile.findOne({ userId });
    if (!profile) {
      profile = await LearningProfile.create({ userId });
    }
    return profile;
  }
}
