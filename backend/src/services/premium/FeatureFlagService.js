import Subscription from "../../models/Subscription.js";

// Default limits per tier. Hardcoding avoided in the DB by using this dictionary.
const TIER_LIMITS = {
  FREE: {
    maxDailyAICalls: 10,
    canCreateClubs: false,
    maxFlashcards: 500,
    hasAdvancedAnalytics: false,
    hasVoiceAnalysis: false,
  },
  PREMIUM: {
    maxDailyAICalls: 100, // Practically unlimited for most
    canCreateClubs: true,
    maxFlashcards: 5000,
    hasAdvancedAnalytics: true,
    hasVoiceAnalysis: true,
  },
  PRO: {
    maxDailyAICalls: Infinity,
    canCreateClubs: true,
    maxFlashcards: Infinity,
    hasAdvancedAnalytics: true,
    hasVoiceAnalysis: true,
  }
};

export class FeatureFlagService {
  /**
   * Retrieves the feature flag limits for a specific user based on their subscription tier.
   */
  static async getUserLimits(userId) {
    try {
      const sub = await Subscription.findOne({ userId });
      const tier = sub && sub.status === 'active' ? sub.tier : 'FREE';
      
      const limits = { ...TIER_LIMITS[tier] };

      // Apply any manual user-specific overrides
      if (sub && sub.features) {
        if (sub.features.unlimitedAI) limits.maxDailyAICalls = Infinity;
      }

      return limits;
    } catch (error) {
      console.error("Error in FeatureFlagService:", error);
      return TIER_LIMITS['FREE']; // Fallback to free tier on error
    }
  }

  /**
   * Check if a user can make an AI call.
   */
  static async canMakeAICall(userId, currentUsageCount) {
    const limits = await this.getUserLimits(userId);
    return currentUsageCount < limits.maxDailyAICalls;
  }
}
