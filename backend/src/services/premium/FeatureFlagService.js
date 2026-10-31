import Subscription from "../../models/Subscription.js";
import { cacheAside, cacheDel } from "../../lib/cache.js";

const TIER_LIMITS = {
  FREE: {
    tier: "FREE",
    maxWindowAICalls: Number(process.env.AI_RATE_LIMIT_FREE) || 10,
    maxDailyAICalls: 10,
    canCreateClubs: false,
    maxFlashcards: 500,
    hasAdvancedAnalytics: false,
    hasVoiceAnalysis: false,
  },
  PREMIUM: {
    tier: "PREMIUM",
    maxWindowAICalls: Number(process.env.AI_RATE_LIMIT_PREMIUM) || 60,
    maxDailyAICalls: 100,
    canCreateClubs: true,
    maxFlashcards: 5000,
    hasAdvancedAnalytics: true,
    hasVoiceAnalysis: true,
  },
  PRO: {
    tier: "PRO",
    maxWindowAICalls: Number(process.env.AI_RATE_LIMIT_PRO) || 300,
    maxDailyAICalls: 1000,
    canCreateClubs: true,
    maxFlashcards: Infinity,
    hasAdvancedAnalytics: true,
    hasVoiceAnalysis: true,
  },
};

const TIER_CACHE_TTL_SECONDS = 300;

function tierCacheKey(userId) {
  return `cache:tier:${userId.toString()}`;
}

export class FeatureFlagService {
  /**
   * Resolves a user's effective subscription tier ("FREE" | "PREMIUM" | "PRO").
   * Checks active Subscription documents first, falling back to User.role.
   */
  static async resolveUserTier(userOrId) {
    const userId = typeof userOrId === "object" && userOrId?._id ? userOrId._id : userOrId;
    const roleHint = typeof userOrId === "object" ? userOrId?.role : null;

    if (!userId) return "FREE";

    try {
      const { data: resolvedTier } = await cacheAside(
        tierCacheKey(userId),
        TIER_CACHE_TTL_SECONDS,
        async () => {
          const sub = await Subscription.findOne({ userId }).lean();
          if (sub && (sub.status === "active" || sub.status === "trialing")) {
            if (sub.features?.unlimitedAI) return "PRO";
            if (TIER_LIMITS[sub.tier]) return sub.tier;
          }

          if (roleHint === "ADMIN") return "PRO";
          if (roleHint === "PREMIUM" || roleHint === "TEACHER") return "PREMIUM";
          return "FREE";
        }
      );

      return TIER_LIMITS[resolvedTier] ? resolvedTier : "FREE";
    } catch (error) {
      console.warn("[FeatureFlagService] Tier lookup failed, defaulting to FREE:", error.message);
      return "FREE";
    }
  }

  static async getUserLimits(userOrId) {
    const tier = await this.resolveUserTier(userOrId);
    return { ...TIER_LIMITS[tier] };
  }

  static async invalidateTierCache(userId) {
    if (!userId) return;
    await cacheDel(tierCacheKey(userId));
  }

  static async canMakeAICall(userId, currentUsageCount) {
    const limits = await this.getUserLimits(userId);
    return currentUsageCount < limits.maxDailyAICalls;
  }
}
