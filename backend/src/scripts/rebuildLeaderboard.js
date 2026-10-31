import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";
import { connectRedis, disconnectRedis } from "../lib/redis.js";
import { LeaderboardService } from "../services/leaderboardService.js";
import { logger } from "../lib/logger.js";

dotenv.config();

async function main() {
  logger.info("[RebuildLeaderboard] Connecting to MongoDB and Redis...");
  await connectDB();
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    logger.error("[RebuildLeaderboard] Redis is not reachable. Check REDIS_URL and try again.");
    await mongoose.disconnect();
    process.exit(1);
  }

  try {
    const start = performance.now();
    const stats = await LeaderboardService.rebuildFromMongo();
    const elapsedMs = (performance.now() - start).toFixed(1);
    logger.info(
      `[RebuildLeaderboard] Completed in ${elapsedMs}ms — rebuilt ${stats.allTimeCount} all-time entries and ${stats.periodicEntries} active periodic entries.`
    );
  } catch (err) {
    logger.error("[RebuildLeaderboard] Failed:", { error: err.message });
    process.exitCode = 1;
  } finally {
    await disconnectRedis();
    await mongoose.disconnect();
  }
}

main();
