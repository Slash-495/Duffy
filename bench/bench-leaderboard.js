import path from "node:path";
import { execFileSync } from "node:child_process";
import { initBenchEnv, startMongo, stopMongo, backendDir, rootDir, toFileUrl } from "./setup.js";

const { redisUrl } = initBenchEnv();

const { connectRedis, setRedisRuntimeEnabled, disconnectRedis } = await import(
  toFileUrl(path.join(backendDir, "src/lib/redis.js"))
);
const User = (await import(toFileUrl(path.join(backendDir, "src/models/User.model.js")))).default;
const LearningProfile = (await import(toFileUrl(path.join(backendDir, "src/models/LearningProfile.js")))).default;
const Leaderboard = (await import(toFileUrl(path.join(backendDir, "src/models/Leaderboard.js")))).default;
const { LeaderboardService, getPeriodKey, getRedisLeaderboardKey } = await import(
  toFileUrl(path.join(backendDir, "src/services/leaderboardService.js"))
);

const USER_COUNT = 1000;

function shuffle(arr) {
  let seed = 42;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function comparePeriod(redis, period, now) {
  const periodKey = getPeriodKey(period, now);
  const redisKey = getRedisLeaderboardKey(period, periodKey);

  // Fetch all entries from Redis sorted set in descending score order
  const rawRedis = await redis.zrevrange(redisKey, 0, -1, "WITHSCORES");
  const redisEntries = [];
  const redisScoreByUser = new Map();
  for (let i = 0; i < rawRedis.length; i += 2) {
    const userId = rawRedis[i];
    const xp = Number(rawRedis[i + 1]);
    redisEntries.push({ userId, xp });
    redisScoreByUser.set(userId, xp);
  }

  // Fetch all entries from MongoDB in descending XP order
  const mongoDocs = await Leaderboard.find({ period, periodKey, xpEarned: { $gt: 0 } })
    .sort({ xpEarned: -1, userId: -1 })
    .select("userId xpEarned")
    .lean();

  const mongoEntries = mongoDocs.map((d) => ({
    userId: d.userId.toString(),
    xp: Number(d.xpEarned),
  }));
  const mongoScoreByUser = new Map(mongoEntries.map((e) => [e.userId, e.xp]));

  const allUserIds = new Set([...redisScoreByUser.keys(), ...mongoScoreByUser.keys()]);
  let scoreMismatches = 0;
  for (const uid of allUserIds) {
    if (redisScoreByUser.get(uid) !== mongoScoreByUser.get(uid)) {
      scoreMismatches += 1;
    }
  }

  let rankMismatches = 0;
  const maxLen = Math.max(redisEntries.length, mongoEntries.length);
  for (let i = 0; i < maxLen; i++) {
    const r = redisEntries[i];
    const m = mongoEntries[i];
    if (!r || !m || r.userId !== m.userId || r.xp !== m.xp) {
      rankMismatches += 1;
    }
  }

  return {
    period,
    redisKey,
    redisCount: redisEntries.length,
    mongoCount: mongoEntries.length,
    scoreMismatches,
    rankMismatches,
  };
}

async function runLeaderboardBenchmark() {
  console.log("================================================================================");
  console.log("BENCHMARK 4: Leaderboard Consistency Under 1,000 Concurrent XP Updates");
  console.log("================================================================================");
  console.log(`Connecting to in-memory MongoDB and Redis at ${redisUrl}...`);

  setRedisRuntimeEnabled(true);
  const { mongod, mongoose } = await startMongo();
  const mongoUri = mongod.getUri();
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    console.error("FAIL: Redis client not ready.");
    process.exit(1);
  }

  const now = new Date();
  const periods = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];
  const keysToClear = periods.map((p) => getRedisLeaderboardKey(p, getPeriodKey(p, now)));
  await redis.del(...keysToClear);

  // Seed 1,000 users and LearningProfiles
  console.log(`Seeding ${USER_COUNT} users and LearningProfiles into local MongoMemoryServer (${mongoUri})...`);
  const users = [];
  const profiles = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const u = new User({
      fullName: `LB User ${i + 1}`,
      email: `bench_lb_${i + 1}@example.com`,
      password: "Password123!",
      nativeLanguage: "English",
      learningLanguage: "French",
      isOnboarded: true,
    });
    users.push(u);
    profiles.push({ userId: u._id, xp: 0, currentStreak: 1, currentCEFR: "A2" });
  }
  await User.insertMany(users, { ordered: false });
  await LearningProfile.insertMany(profiles, { ordered: false });

  // Assign deterministic unique XP totals (10, 20, ..., 10000) in shuffled order so ranks are strictly unique
  const uniqueXps = shuffle(Array.from({ length: USER_COUNT }, (_, idx) => (idx + 1) * 10));

  console.log(`Firing ${USER_COUNT} concurrent XP updates (MongoDB + Redis dual-write)...`);
  const updateStart = performance.now();
  await Promise.all(
    users.map(async (u, idx) => {
      const delta = uniqueXps[idx];
      await LearningProfile.updateOne({ userId: u._id }, { $inc: { xp: delta } });
      await LeaderboardService.recordXP(u._id, delta, now);
    })
  );
  const updateElapsedMs = (performance.now() - updateStart).toFixed(2);
  console.log(`Completed ${USER_COUNT} concurrent XP updates in ${updateElapsedMs} ms.\n`);

  // Step 1: Compare immediately after concurrent updates (pre-rebuild)
  const preResults = [];
  for (const period of periods) {
    preResults.push(await comparePeriod(redis, period, now));
  }

  // Step 2: Run the actual backend/src/scripts/rebuildLeaderboard.js script against local MongoMemoryServer
  const rebuildScriptPath = path.join(backendDir, "src/scripts/rebuildLeaderboard.js");
  console.log(
    `Running rebuildLeaderboard script against local MongoMemoryServer: node ${path.relative(rootDir, rebuildScriptPath)}`
  );
  const rebuildStart = performance.now();
  const rebuildStdout = execFileSync("node", [rebuildScriptPath], {
    cwd: path.join(rootDir, "bench"), // Avoid loading backend/.env
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "development",
      MONGO_URL: mongoUri,
      REDIS_URL: redisUrl,
      REDIS_ENABLED: "true",
    },
  });
  const rebuildElapsedMs = (performance.now() - rebuildStart).toFixed(2);
  if (!rebuildStdout.includes("127.0.0.1")) {
    throw new Error("Safety abort: rebuildLeaderboard.js did not connect to local 127.0.0.1 MongoDB!");
  }
  console.log("rebuildLeaderboard.js stdout:");
  console.log(rebuildStdout.trim());
  console.log(`rebuildLeaderboard.js wall time: ${rebuildElapsedMs} ms\n`);

  // Step 3: Compare again after rebuildLeaderboard.js
  const postResults = [];
  for (const period of periods) {
    postResults.push(await comparePeriod(redis, period, now));
  }

  console.log("--- Comparison Table: Before vs After rebuildLeaderboard.js ---");
  console.log("| Stage          | Period   | Redis Count | Mongo Count | Score Mismatches | Rank Mismatches |");
  console.log("|----------------|----------|-------------|-------------|------------------|-----------------|");
  for (const r of preResults) {
    console.log(
      `| Before rebuild | ${r.period.padEnd(8)} | ${String(r.redisCount).padStart(11)} | ${String(
        r.mongoCount
      ).padStart(11)} | ${String(r.scoreMismatches).padStart(16)} | ${String(r.rankMismatches).padStart(15)} |`
    );
  }
  for (const r of postResults) {
    console.log(
      `| After rebuild  | ${r.period.padEnd(8)} | ${String(r.redisCount).padStart(11)} | ${String(
        r.mongoCount
      ).padStart(11)} | ${String(r.scoreMismatches).padStart(16)} | ${String(r.rankMismatches).padStart(15)} |`
    );
  }

  const totalPreMismatches = preResults.reduce((acc, r) => acc + r.scoreMismatches + r.rankMismatches, 0);
  const totalPostMismatches = postResults.reduce((acc, r) => acc + r.scoreMismatches + r.rankMismatches, 0);

  console.log("\nSummary:");
  console.log(`- Concurrent users updated : ${USER_COUNT} (${updateElapsedMs} ms)`);
  console.log(`- Total mismatches BEFORE rebuildLeaderboard.js: ${totalPreMismatches}`);
  console.log(`- Total mismatches AFTER  rebuildLeaderboard.js: ${totalPostMismatches}`);

  // Cleanup Redis keys
  await redis.del(...keysToClear);
  await disconnectRedis();
  await stopMongo(mongod, mongoose);
}

runLeaderboardBenchmark().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
