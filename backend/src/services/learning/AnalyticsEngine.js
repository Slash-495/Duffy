import LearningProfile from "../../models/LearningProfile.js";
import { LeaderboardService } from "../leaderboardService.js";
import { cacheAside, cacheDel } from "../../lib/cache.js";

const PROFILE_CACHE_TTL_SECONDS = 120;

function profileCacheKey(userId) {
  return `cache:learning:profile:${userId.toString()}`;
}

function toUtcDayNumber(date) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

export class AnalyticsEngine {
  /**
   * Awards XP to a user, updates UTC calendar-day streaks in MongoDB,
   * syncs Redis Sorted Set leaderboards, and invalidates cached profile data.
   */
  static async awardXP(userId, rawAmount) {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500) {
      const err = new Error("XP amount must be a positive number between 1 and 500");
      err.statusCode = 400;
      throw err;
    }

    let profile = await LearningProfile.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true }
    );

    profile.xp += amount;

    const now = new Date();
    const lastActive = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;

    if (!lastActive) {
      profile.currentStreak = 1;
      profile.longestStreak = Math.max(1, profile.longestStreak || 0);
    } else {
      const diffDays = toUtcDayNumber(now) - toUtcDayNumber(lastActive);
      if (diffDays === 1) {
        profile.currentStreak += 1;
        if (profile.currentStreak > profile.longestStreak) {
          profile.longestStreak = profile.currentStreak;
        }
      } else if (diffDays > 1) {
        profile.currentStreak = 1;
      }
    }

    profile.lastActiveDate = now;
    await profile.save();

    await Promise.all([
      LeaderboardService.recordXP(userId, amount, now),
      cacheDel(profileCacheKey(userId)),
    ]);

    return {
      xp: profile.xp,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      awarded: amount,
    };
  }

  static async getProfileWithCacheMeta(userId) {
    return cacheAside(profileCacheKey(userId), PROFILE_CACHE_TTL_SECONDS, async () => {
      const doc = await LearningProfile.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true, new: true }
      ).lean();
      return doc;
    });
  }

  static async getProfile(userId) {
    const { data } = await this.getProfileWithCacheMeta(userId);
    return data;
  }

  static async invalidateProfileCache(userId) {
    if (!userId) return;
    await cacheDel(profileCacheKey(userId));
  }
}
