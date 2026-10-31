import mongoose from "mongoose";
import Leaderboard from "../models/Leaderboard.js";
import LearningProfile from "../models/LearningProfile.js";
import User from "../models/User.model.js";
import { getRedisClient } from "../lib/redis.js";
import { cacheDel } from "../lib/cache.js";

const PERIOD_TTLS = {
  DAILY: 14 * 24 * 60 * 60,   // 14 days
  WEEKLY: 35 * 24 * 60 * 60,  // 35 days
  MONTHLY: 90 * 24 * 60 * 60, // 90 days
  ALL_TIME: null,             // persistent in Redis
};

const USER_SUMMARY_TTL_SECONDS = 600;
const warmedKeys = new Set();
const warmingPromises = new Map();

export function normalizePeriod(raw = "weekly") {
  const upper = String(raw).trim().toUpperCase().replace("-", "_");
  if (upper === "DAILY") return "DAILY";
  if (upper === "WEEKLY") return "WEEKLY";
  if (upper === "MONTHLY") return "MONTHLY";
  if (upper === "ALLTIME" || upper === "ALL_TIME") return "ALL_TIME";
  return "WEEKLY";
}

/**
 * Computes ISO-8601 week key ("2026-W44"), UTC day key ("2026-10-31"), or month key ("2026-10").
 */
export function getPeriodKey(period, date = new Date()) {
  if (period === "ALL_TIME") return "ALL_TIME";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (period === "DAILY") {
    return `${year}-${month}-${day}`;
  }
  if (period === "MONTHLY") {
    return `${year}-${month}`;
  }

  // ISO week calculation in UTC
  const tmp = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getRedisLeaderboardKey(period, periodKey) {
  if (period === "ALL_TIME") return "leaderboard:alltime";
  return `leaderboard:${period.toLowerCase()}:${periodKey}`;
}

export function userSummaryCacheKey(userId) {
  return `cache:user:summary:${userId.toString()}`;
}

export function encodeLeaderboardCursor(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeLeaderboardCursor(cursorStr) {
  if (!cursorStr || typeof cursorStr !== "string") return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursorStr, "base64url").toString("utf8"));
    if (
      typeof parsed.offset === "number" &&
      parsed.offset >= 0 &&
      Number.isInteger(parsed.offset)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch-fetches lightweight user display metadata using Redis MGET + MongoDB cache-aside fill.
 */
async function hydrateUserSummaries(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];
  const summaryMap = new Map();
  if (uniqueIds.length === 0) return summaryMap;

  const client = getRedisClient();
  let missingIds = uniqueIds;

  if (client) {
    try {
      const keys = uniqueIds.map((id) => userSummaryCacheKey(id));
      const cachedValues = await client.mget(...keys);
      missingIds = [];
      cachedValues.forEach((raw, idx) => {
        const id = uniqueIds[idx];
        if (raw) {
          try {
            summaryMap.set(id, JSON.parse(raw));
            return;
          } catch {
            // Fall through to DB fetch on corrupt cache entry
          }
        }
        missingIds.push(id);
      });
    } catch (err) {
      console.warn(`[Leaderboard] Redis summary MGET failed: ${err.message}`);
      missingIds = uniqueIds;
    }
  }

  if (missingIds.length > 0) {
    const validObjectIds = missingIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: validObjectIds } })
        .select("fullName profilePic nativeLanguage learningLanguage")
        .lean(),
      LearningProfile.find({ userId: { $in: validObjectIds } })
        .select("userId currentStreak currentCEFR")
        .lean(),
    ]);

    const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]));
    const pipeline = client ? client.pipeline() : null;

    for (const u of users) {
      const idStr = u._id.toString();
      const prof = profileByUser.get(idStr);
      const summary = {
        userId: idStr,
        fullName: u.fullName || "Learner",
        profilePic: u.profilePic || "",
        nativeLanguage: u.nativeLanguage || "English",
        learningLanguage: u.learningLanguage || "None",
        streak: prof?.currentStreak || 0,
        cefr: prof?.currentCEFR || "A1",
      };
      summaryMap.set(idStr, summary);
      if (pipeline) {
        pipeline.set(
          userSummaryCacheKey(idStr),
          JSON.stringify(summary),
          "EX",
          USER_SUMMARY_TTL_SECONDS
        );
      }
    }

    if (pipeline) {
      pipeline.exec().catch(() => {});
    }
  }

  return summaryMap;
}

export class LeaderboardService {
  static async invalidateUserSummary(userId) {
    if (!userId) return;
    await cacheDel(userSummaryCacheKey(userId));
  }

  /**
   * Atomically increments XP in MongoDB Leaderboard documents (durable source of truth)
   * and updates Redis Sorted Sets via ZINCRBY.
   */
  static async recordXP(userId, amount, now = new Date()) {
    if (!userId || !amount || amount <= 0) return;

    const userIdStr = userId.toString();
    const periods = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];

    // 1. Durable write to MongoDB Leaderboard collection
    const bulkOps = periods.map((period) => {
      const periodKey = getPeriodKey(period, now);
      return {
        updateOne: {
          filter: { userId, period, periodKey },
          update: { $inc: { xpEarned: amount } },
          upsert: true,
        },
      };
    });

    await Leaderboard.bulkWrite(bulkOps, { ordered: false });

    // 2. Real-time update in Redis Sorted Sets
    const client = getRedisClient();
    if (client) {
      try {
        const pipeline = client.pipeline();
        for (const period of periods) {
          const periodKey = getPeriodKey(period, now);
          const redisKey = getRedisLeaderboardKey(period, periodKey);
          pipeline.zincrby(redisKey, amount, userIdStr);
          const ttl = PERIOD_TTLS[period];
          if (ttl) {
            pipeline.expire(redisKey, ttl);
          }
          warmedKeys.add(redisKey);
        }
        pipeline.del(userSummaryCacheKey(userIdStr));
        await pipeline.exec();
      } catch (err) {
        console.warn(`[Leaderboard] Redis ZINCRBY failed (MongoDB updated): ${err.message}`);
      }
    }
  }

  /**
   * Rebuilds Redis Sorted Sets from MongoDB source-of-truth collections.
   * Safe to run concurrently or via CLI (npm run rebuild:leaderboard).
   */
  static async rebuildFromMongo(now = new Date()) {
    const client = getRedisClient();
    if (!client) {
      throw new Error("Redis client is not connected; cannot rebuild Redis sorted sets.");
    }

    const stats = { allTimeCount: 0, periodicEntries: 0 };

    // 1. Sync ALL_TIME from LearningProfile (canonical total XP) into both Mongo Leaderboard & Redis
    const profiles = await LearningProfile.find({ xp: { $gt: 0 } })
      .select("userId xp")
      .lean();

    if (profiles.length > 0) {
      const mongoSyncOps = profiles.map((p) => ({
        updateOne: {
          filter: { userId: p.userId, period: "ALL_TIME", periodKey: "ALL_TIME" },
          update: { $set: { xpEarned: p.xp } },
          upsert: true,
        },
      }));
      await Leaderboard.bulkWrite(mongoSyncOps, { ordered: false });
    }

    const allTimeTmpKey = `leaderboard:alltime:tmp:${Date.now()}`;
    if (profiles.length > 0) {
      const pipe = client.pipeline();
      for (const p of profiles) {
        pipe.zadd(allTimeTmpKey, p.xp, p.userId.toString());
      }
      pipe.rename(allTimeTmpKey, "leaderboard:alltime");
      await pipe.exec();
      stats.allTimeCount = profiles.length;
    } else {
      await client.del("leaderboard:alltime");
    }
    warmedKeys.add("leaderboard:alltime");

    // 2. Rebuild active DAILY, WEEKLY, MONTHLY sorted sets from MongoDB Leaderboard collection
    for (const period of ["DAILY", "WEEKLY", "MONTHLY"]) {
      const periodKey = getPeriodKey(period, now);
      const redisKey = getRedisLeaderboardKey(period, periodKey);
      const docs = await Leaderboard.find({
        period,
        periodKey,
        xpEarned: { $gt: 0 },
      })
        .select("userId xpEarned")
        .lean();

      const tmpKey = `${redisKey}:tmp:${Date.now()}`;
      if (docs.length > 0) {
        const pipe = client.pipeline();
        for (const d of docs) {
          pipe.zadd(tmpKey, d.xpEarned, d.userId.toString());
        }
        pipe.rename(tmpKey, redisKey);
        if (PERIOD_TTLS[period]) {
          pipe.expire(redisKey, PERIOD_TTLS[period]);
        }
        await pipe.exec();
        stats.periodicEntries += docs.length;
      } else {
        await client.del(redisKey);
      }
      warmedKeys.add(redisKey);
    }

    return stats;
  }

  /**
   * Lazily warms a single Redis sorted set from MongoDB if Redis restarted empty.
   */
  static async ensureKeyWarmed(client, period, periodKey, redisKey) {
    if (warmedKeys.has(redisKey)) return;

    if (warmingPromises.has(redisKey)) {
      await warmingPromises.get(redisKey);
      return;
    }

    const promise = (async () => {
      try {
        const card = await client.zcard(redisKey);
        if (card > 0) {
          warmedKeys.add(redisKey);
          return;
        }

        if (period === "ALL_TIME") {
          const profiles = await LearningProfile.find({ xp: { $gt: 0 } })
            .select("userId xp")
            .lean();
          if (profiles.length > 0) {
            const pipe = client.pipeline();
            for (const p of profiles) {
              pipe.zadd(redisKey, p.xp, p.userId.toString());
            }
            await pipe.exec();
          }
        } else {
          const docs = await Leaderboard.find({
            period,
            periodKey,
            xpEarned: { $gt: 0 },
          })
            .select("userId xpEarned")
            .lean();
          if (docs.length > 0) {
            const pipe = client.pipeline();
            for (const d of docs) {
              pipe.zadd(redisKey, d.xpEarned, d.userId.toString());
            }
            if (PERIOD_TTLS[period]) {
              pipe.expire(redisKey, PERIOD_TTLS[period]);
            }
            await pipe.exec();
          }
        }
        warmedKeys.add(redisKey);
      } finally {
        warmingPromises.delete(redisKey);
      }
    })();

    warmingPromises.set(redisKey, promise);
    await promise;
  }

  /**
   * Fetches top rankings + caller's exact rank using Redis ZREVRANGE & ZREVRANK,
   * gracefully falling back to MongoDB queries when Redis is unavailable.
   */
  static async getLeaderboard({
    period: rawPeriod = "weekly",
    limit: rawLimit = 20,
    cursor: rawCursor = null,
    currentUserId = null,
  }) {
    const period = normalizePeriod(rawPeriod);
    const periodKey = getPeriodKey(period);
    const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);
    const decodedCursor = decodeLeaderboardCursor(rawCursor);
    const offset = decodedCursor?.offset || 0;
    const currentUserIdStr = currentUserId ? currentUserId.toString() : null;

    const client = getRedisClient();
    if (client) {
      try {
        const redisKey = getRedisLeaderboardKey(period, periodKey);
        await this.ensureKeyWarmed(client, period, periodKey, redisKey);

        const pipe = client.pipeline();
        pipe.zrevrange(redisKey, offset, offset + limit - 1, "WITHSCORES");
        pipe.zcard(redisKey);
        if (currentUserIdStr) {
          pipe.zrevrank(redisKey, currentUserIdStr);
          pipe.zscore(redisKey, currentUserIdStr);
        }

        const results = await pipe.exec();
        const rawRange = results[0]?.[1] || [];
        const totalParticipants = Number(results[1]?.[1] || 0);
        const callerZeroRank = currentUserIdStr ? results[2]?.[1] : null;
        const callerScoreRaw = currentUserIdStr ? results[3]?.[1] : null;

        const slicePairs = [];
        for (let i = 0; i < rawRange.length; i += 2) {
          slicePairs.push({
            userId: rawRange[i],
            xp: Number(rawRange[i + 1] || 0),
          });
        }

        const idsToHydrate = slicePairs.map((p) => p.userId);
        if (currentUserIdStr) idsToHydrate.push(currentUserIdStr);

        const summaryMap = await hydrateUserSummaries(idsToHydrate);

        const entries = slicePairs.map((pair, idx) => {
          const meta = summaryMap.get(pair.userId) || {};
          return {
            rank: offset + idx + 1,
            userId: pair.userId,
            fullName: meta.fullName || "Learner",
            profilePic: meta.profilePic || "",
            nativeLanguage: meta.nativeLanguage || "English",
            learningLanguage: meta.learningLanguage || "None",
            streak: meta.streak || 0,
            xp: pair.xp,
            isCurrentUser: pair.userId === currentUserIdStr,
          };
        });

        let currentUser = null;
        if (currentUserIdStr) {
          const meta = summaryMap.get(currentUserIdStr) || {};
          currentUser = {
            userId: currentUserIdStr,
            rank: callerZeroRank !== null && callerZeroRank !== undefined ? Number(callerZeroRank) + 1 : null,
            xp: callerScoreRaw !== null && callerScoreRaw !== undefined ? Number(callerScoreRaw) : 0,
            streak: meta.streak || 0,
            fullName: meta.fullName || "You",
            profilePic: meta.profilePic || "",
          };
        }

        const hasMore = offset + entries.length < totalParticipants;
        const lastEntry = entries[entries.length - 1];
        const nextCursor =
          hasMore && lastEntry
            ? encodeLeaderboardCursor({
                offset: offset + entries.length,
                xp: lastEntry.xp,
                id: lastEntry.userId,
              })
            : null;

        return {
          period,
          periodKey,
          source: "redis",
          totalParticipants,
          currentUser,
          entries,
          pagination: {
            limit,
            hasMore,
            nextCursor,
          },
        };
      } catch (err) {
        console.warn(`[Leaderboard] Redis read failed, falling back to MongoDB: ${err.message}`);
      }
    }

    // MongoDB Fallback Path
    return this.getLeaderboardFromMongo({
      period,
      periodKey,
      limit,
      decodedCursor,
      offset,
      currentUserIdStr,
    });
  }

  static async getLeaderboardFromMongo({
    period,
    periodKey,
    limit,
    decodedCursor,
    offset,
    currentUserIdStr,
  }) {
    let rawDocs = [];
    let totalParticipants = 0;
    let callerXp = 0;
    let callerRank = null;

    if (period === "ALL_TIME") {
      const baseFilter = { xp: { $gt: 0 } };
      const cursorFilter =
        decodedCursor?.xp !== undefined &&
        decodedCursor?.id &&
        mongoose.Types.ObjectId.isValid(decodedCursor.id)
          ? {
              $and: [
                baseFilter,
                {
                  $or: [
                    { xp: { $lt: decodedCursor.xp } },
                    {
                      xp: decodedCursor.xp,
                      userId: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) },
                    },
                  ],
                },
              ],
            }
          : baseFilter;

      const [docs, count, callerDoc] = await Promise.all([
        LearningProfile.find(cursorFilter)
          .sort({ xp: -1, userId: 1 })
          .limit(limit)
          .select("userId xp currentStreak")
          .lean(),
        LearningProfile.countDocuments(baseFilter),
        currentUserIdStr && mongoose.Types.ObjectId.isValid(currentUserIdStr)
          ? LearningProfile.findOne({ userId: currentUserIdStr }).select("xp currentStreak").lean()
          : null,
      ]);

      rawDocs = docs.map((d) => ({ userId: d.userId.toString(), xp: d.xp }));
      totalParticipants = count;

      if (callerDoc && callerDoc.xp > 0) {
        callerXp = callerDoc.xp;
        const higherCount = await LearningProfile.countDocuments({ xp: { $gt: callerXp } });
        callerRank = higherCount + 1;
      }
    } else {
      const baseFilter = { period, periodKey, xpEarned: { $gt: 0 } };
      const cursorFilter =
        decodedCursor?.xp !== undefined &&
        decodedCursor?.id &&
        mongoose.Types.ObjectId.isValid(decodedCursor.id)
          ? {
              $and: [
                baseFilter,
                {
                  $or: [
                    { xpEarned: { $lt: decodedCursor.xp } },
                    {
                      xpEarned: decodedCursor.xp,
                      userId: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) },
                    },
                  ],
                },
              ],
            }
          : baseFilter;

      const [docs, count, callerDoc] = await Promise.all([
        Leaderboard.find(cursorFilter)
          .sort({ xpEarned: -1, userId: 1 })
          .limit(limit)
          .select("userId xpEarned")
          .lean(),
        Leaderboard.countDocuments(baseFilter),
        currentUserIdStr && mongoose.Types.ObjectId.isValid(currentUserIdStr)
          ? Leaderboard.findOne({ userId: currentUserIdStr, period, periodKey })
              .select("xpEarned")
              .lean()
          : null,
      ]);

      rawDocs = docs.map((d) => ({ userId: d.userId.toString(), xp: d.xpEarned }));
      totalParticipants = count;

      if (callerDoc && callerDoc.xpEarned > 0) {
        callerXp = callerDoc.xpEarned;
        const higherCount = await Leaderboard.countDocuments({
          period,
          periodKey,
          xpEarned: { $gt: callerXp },
        });
        callerRank = higherCount + 1;
      }
    }

    const idsToHydrate = rawDocs.map((d) => d.userId);
    if (currentUserIdStr) idsToHydrate.push(currentUserIdStr);
    const summaryMap = await hydrateUserSummaries(idsToHydrate);

    const entries = rawDocs.map((pair, idx) => {
      const meta = summaryMap.get(pair.userId) || {};
      return {
        rank: offset + idx + 1,
        userId: pair.userId,
        fullName: meta.fullName || "Learner",
        profilePic: meta.profilePic || "",
        nativeLanguage: meta.nativeLanguage || "English",
        learningLanguage: meta.learningLanguage || "None",
        streak: meta.streak || 0,
        xp: pair.xp,
        isCurrentUser: pair.userId === currentUserIdStr,
      };
    });

    let currentUser = null;
    if (currentUserIdStr) {
      const meta = summaryMap.get(currentUserIdStr) || {};
      currentUser = {
        userId: currentUserIdStr,
        rank: callerRank,
        xp: callerXp,
        streak: meta.streak || 0,
        fullName: meta.fullName || "You",
        profilePic: meta.profilePic || "",
      };
    }

    const hasMore = offset + entries.length < totalParticipants && entries.length === limit;
    const lastEntry = entries[entries.length - 1];
    const nextCursor =
      hasMore && lastEntry
        ? encodeLeaderboardCursor({
            offset: offset + entries.length,
            xp: lastEntry.xp,
            id: lastEntry.userId,
          })
        : null;

    return {
      period,
      periodKey,
      source: "mongodb",
      totalParticipants,
      currentUser,
      entries,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    };
  }
}
