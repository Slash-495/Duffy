import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";
import { connectRedis, disconnectRedis } from "../lib/redis.js";
import { LeaderboardService } from "../services/leaderboardService.js";

dotenv.config();

async function main() {
  console.log("[RebuildLeaderboard] Connecting to MongoDB and Redis...");
  await connectDB();
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    console.error("[RebuildLeaderboard] Redis is not reachable. Check REDIS_URL and try again.");
    await mongoose.disconnect();
    process.exit(1);
  }

  try {
    const start = performance.now();
    const stats = await LeaderboardService.rebuildFromMongo();
    const elapsedMs = (performance.now() - start).toFixed(1);
    console.log(
      `[RebuildLeaderboard] Completed in ${elapsedMs}ms — rebuilt ${stats.allTimeCount} all-time entries and ${stats.periodicEntries} active periodic entries.`
    );
  } catch (err) {
    console.error("[RebuildLeaderboard] Failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnectRedis();
    await mongoose.disconnect();
  }
}

main();
