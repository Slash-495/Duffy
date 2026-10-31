import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");

const requireFromBackend = createRequire(path.join(backendDir, "package.json"));
const dotenv = requireFromBackend("dotenv");
const autocannon = requireFromBackend("autocannon");
const mongoose = requireFromBackend("mongoose");
const jwt = requireFromBackend("jsonwebtoken");

dotenv.config({ path: path.join(backendDir, ".env") });

// Ensure rate limiters do not artificially throttle load-test throughput
process.env.NODE_ENV = "test";
process.env.API_RATE_LIMIT_MAX = "1000000";
process.env.AI_RATE_LIMIT_PRO = "1000000";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379/15";

const BENCH_DB_NAME = "duffy_bench_tmp";
const SEED_USER_COUNT = Number(process.env.BENCH_USERS) || 1000;
const DURATION_SECONDS = Number(process.env.BENCH_DURATION) || 8;
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS) || 10;
const LIVE_GEMINI_SAMPLES = Number(process.env.BENCH_GEMINI_SAMPLES) || 3;

function computePercentile(sortedValues, percentile) {
  if (!sortedValues.length) return 0;
  const idx = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  const clamped = Math.max(0, Math.min(sortedValues.length - 1, idx));
  return Number(sortedValues[clamped].toFixed(2));
}

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    const responseTimesMs = [];
    const instance = autocannon(options, (err, result) => {
      if (err) return reject(err);
      responseTimesMs.sort((a, b) => a - b);
      const p50 = computePercentile(responseTimesMs, 50);
      const p95 = computePercentile(responseTimesMs, 95);
      const p99 = computePercentile(responseTimesMs, 99);
      const mean = responseTimesMs.length
        ? Number(
            (
              responseTimesMs.reduce((acc, v) => acc + v, 0) / responseTimesMs.length
            ).toFixed(2)
          )
        : Number((result.latency?.average || 0).toFixed(2));

      const totalCompleted =
        (result["2xx"] || 0) +
        (result["1xx"] || 0) +
        (result["3xx"] || 0) +
        (result["4xx"] || 0) +
        (result["5xx"] || 0);
      const durationSec = result.duration || (result.finish - result.start) / 1000 || 1;
      const measuredReqPerSec = Number(
        (result.requests?.average || totalCompleted / durationSec).toFixed(2)
      );

      resolve({
        title: options.title,
        connections: options.connections,
        durationSec: Number(durationSec.toFixed(2)),
        requestsTotal: totalCompleted,
        status2xx: result["2xx"] || 0,
        non2xx: result.non2xx || 0,
        errors: result.errors || 0,
        timeouts: result.timeouts || 0,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        meanMs: mean,
        reqPerSec: measuredReqPerSec,
      });
    });

    instance.on("response", (_client, statusCode, _resBytes, responseTime) => {
      if (statusCode >= 200 && statusCode < 300) {
        responseTimesMs.push(responseTime);
      }
    });
  });
}

async function main() {
  const mongoUrl = process.env.BENCHMARK_MONGO_URL || process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL (or BENCHMARK_MONGO_URL) is required to run benchmarks.");
  }
  if (!process.env.JWT_SECRET_KEY) {
    process.env.JWT_SECRET_KEY = "benchmark_ephemeral_jwt_secret";
  }

  console.log("=== Duffy System Design Benchmark Suite ===");
  console.log(`Node ${process.version} | ${os.platform()} ${os.arch()} | CPUs: ${os.cpus().length}`);
  console.log(`Isolated MongoDB database: ${BENCH_DB_NAME} (${SEED_USER_COUNT} seeded users)`);
  console.log(`Target Redis URL: ${process.env.REDIS_URL}`);

  await mongoose.connect(mongoUrl, { dbName: BENCH_DB_NAME });
  if (mongoose.connection.name !== BENCH_DB_NAME) {
    throw new Error(`Safety abort: expected DB ${BENCH_DB_NAME}, got ${mongoose.connection.name}`);
  }

  const { app } = await import("../backend/src/server.js");
  const {
    connectRedis,
    disconnectRedis,
    isRedisAvailable,
    setRedisRuntimeEnabled,
    getRedisClient,
  } = await import("../backend/src/lib/redis.js");
  const User = (await import("../backend/src/models/User.model.js")).default;
  const LearningProfile = (await import("../backend/src/models/LearningProfile.js")).default;
  const Leaderboard = (await import("../backend/src/models/Leaderboard.js")).default;
  const Subscription = (await import("../backend/src/models/Subscription.js")).default;
  const { LeaderboardService, getPeriodKey } = await import(
    "../backend/src/services/leaderboardService.js"
  );

  await connectRedis();
  if (!isRedisAvailable()) {
    throw new Error(
      `Redis is not reachable at ${process.env.REDIS_URL}. Start Redis first (e.g., docker run -d --name duffy-redis -p 6379:6379 redis:7-alpine).`
    );
  }

  const redisInfo = await getRedisClient().info("server");
  const redisVersion =
    redisInfo
      .split("\n")
      .find((l) => l.startsWith("redis_version:"))
      ?.split(":")[1]
      ?.trim() || "unknown";
  console.log(`Connected to Redis v${redisVersion}`);

  const server = await new Promise((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Clean any leftover state in temporary benchmark DB
    await mongoose.connection.dropDatabase();
    await Promise.all([
      User.syncIndexes(),
      LearningProfile.syncIndexes(),
      Leaderboard.syncIndexes(),
      Subscription.syncIndexes(),
    ]);

    // Seed 1,000 realistic learners
    console.log(`Seeding ${SEED_USER_COUNT} users + profiles + leaderboard rows...`);
    const weeklyKey = getPeriodKey("WEEKLY");
    const usersToInsert = [];
    const profilesToInsert = [];
    const leaderboardToInsert = [];

    for (let i = 0; i < SEED_USER_COUNT; i++) {
      const uid = new mongoose.Types.ObjectId();
      const xp = 100 + ((i * 73) % 25000);
      const streak = i % 45;
      usersToInsert.push({
        _id: uid,
        fullName: `Bench Learner ${i + 1}`,
        email: `bench.user.${i + 1}@duffy-bench.local`,
        password: "HashedPasswordPlaceholder123!",
        nativeLanguage: "English",
        learningLanguage: i % 2 === 0 ? "Spanish" : "Japanese",
        isOnboarded: true,
        role: i === 0 ? "ADMIN" : "USER",
        subscriptionTier: i === 0 ? "PRO" : "FREE",
      });
      profilesToInsert.push({
        userId: uid,
        xp,
        currentStreak: streak,
        longestStreak: streak,
        currentCEFR: "B1",
        targetCEFR: "C1",
      });
      leaderboardToInsert.push(
        {
          userId: uid,
          period: "ALL_TIME",
          periodKey: "ALL_TIME",
          xpEarned: xp,
        },
        {
          userId: uid,
          period: "WEEKLY",
          periodKey: weeklyKey,
          xpEarned: Math.floor(xp / 4),
        }
      );
    }

    await User.insertMany(usersToInsert, { ordered: false });
    await LearningProfile.insertMany(profilesToInsert, { ordered: false });
    await Leaderboard.insertMany(leaderboardToInsert, { ordered: false });

    const callerId = usersToInsert[Math.floor(SEED_USER_COUNT / 2)]._id;
    await Subscription.create({
      userId: callerId,
      tier: "PRO",
      status: "active",
      features: { unlimitedAI: true },
    });

    const token = jwt.sign({ userId: callerId.toString() }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });
    const cookieHeader = `jwt=${token}`;

    // =========================================================================
    // 1. LEADERBOARD BENCHMARK: Redis OFF vs Redis ON
    // =========================================================================
    console.log("\n[1/4] Benchmarking GET /api/leaderboard (Redis OFF — MongoDB fallback)...");
    setRedisRuntimeEnabled(false);

    const warmLbOff = await fetch(`${baseUrl}/api/leaderboard?period=alltime&limit=20`, {
      headers: { Cookie: cookieHeader },
    });
    if (warmLbOff.status !== 200 || warmLbOff.headers.get("x-leaderboard-source") !== "mongodb") {
      throw new Error(
        `Unexpected Leaderboard Redis-OFF probe: status=${warmLbOff.status}, source=${warmLbOff.headers.get(
          "x-leaderboard-source"
        )}`
      );
    }

    const leaderboardOff = await runAutocannon({
      title: "GET /api/leaderboard (Redis OFF)",
      url: `${baseUrl}/api/leaderboard?period=alltime&limit=20`,
      method: "GET",
      headers: { Cookie: cookieHeader },
      connections: CONNECTIONS,
      duration: DURATION_SECONDS,
    });
    console.log("  ->", leaderboardOff);

    console.log("\n[2/4] Benchmarking GET /api/leaderboard (Redis ON — Sorted Set + MGET)...");
    setRedisRuntimeEnabled(true);
    await LeaderboardService.rebuildFromMongo();

    // Warm summary cache once so steady-state sorted-set + MGET is measured
    const warmLbOn = await fetch(`${baseUrl}/api/leaderboard?period=alltime&limit=20`, {
      headers: { Cookie: cookieHeader },
    });
    if (warmLbOn.status !== 200 || warmLbOn.headers.get("x-leaderboard-source") !== "redis") {
      throw new Error(
        `Unexpected Leaderboard Redis-ON probe: status=${warmLbOn.status}, source=${warmLbOn.headers.get(
          "x-leaderboard-source"
        )}`
      );
    }

    const leaderboardOn = await runAutocannon({
      title: "GET /api/leaderboard (Redis ON)",
      url: `${baseUrl}/api/leaderboard?period=alltime&limit=20`,
      method: "GET",
      headers: { Cookie: cookieHeader },
      connections: CONNECTIONS,
      duration: DURATION_SECONDS,
    });
    console.log("  ->", leaderboardOn);

    // =========================================================================
    // 2. GEMINI ENDPOINT BENCHMARK: POST /api/ai/grammar (Redis OFF vs Redis ON)
    // =========================================================================
    const grammarPayload = JSON.stringify({
      message: "She go to school yesterday and buyed two book.",
      targetLanguage: "English",
    });

    console.log(
      `\n[3/4] Benchmarking POST /api/ai/grammar (Redis OFF — ${LIVE_GEMINI_SAMPLES} live uncached Gemini calls)...`
    );
    setRedisRuntimeEnabled(false);

    const aiOff = await runAutocannon({
      title: "POST /api/ai/grammar (Redis OFF, Live Gemini)",
      url: `${baseUrl}/api/ai/grammar`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: grammarPayload,
      connections: 1,
      amount: LIVE_GEMINI_SAMPLES,
      timeout: 30,
    });
    console.log("  ->", aiOff);

    console.log(
      "\n[4/4] Benchmarking POST /api/ai/grammar (Redis ON — Cache-Aside HIT + Lua Rate Limiter)..."
    );
    setRedisRuntimeEnabled(true);

    // Populate SHA-256 prompt cache key on first request (MISS -> HIT)
    const warmAiMiss = await fetch(`${baseUrl}/api/ai/grammar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: grammarPayload,
    });
    if (warmAiMiss.status !== 200) {
      throw new Error(`Warm AI call failed with status ${warmAiMiss.status}`);
    }

    const verifyAiHit = await fetch(`${baseUrl}/api/ai/grammar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: grammarPayload,
    });
    if (verifyAiHit.headers.get("x-cache") !== "HIT") {
      throw new Error(`Expected X-Cache: HIT, got ${verifyAiHit.headers.get("x-cache")}`);
    }

    const aiOn = await runAutocannon({
      title: "POST /api/ai/grammar (Redis ON, Cache HIT)",
      url: `${baseUrl}/api/ai/grammar`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: grammarPayload,
      connections: CONNECTIONS,
      duration: DURATION_SECONDS,
    });
    console.log("  ->", aiOn);

    const summary = {
      measuredAt: new Date().toISOString(),
      environment: {
        node: process.version,
        os: `${os.type()} ${os.release()} (${os.arch()})`,
        cpuModel: os.cpus()[0]?.model?.trim() || "Unknown CPU",
        cpuCores: os.cpus().length,
        redisVersion,
        mongoHost: mongoose.connection.host,
        seededUsers: SEED_USER_COUNT,
      },
      results: {
        leaderboardOff,
        leaderboardOn,
        aiOff,
        aiOn,
      },
    };

    const jsonOutIdx = process.argv.indexOf("--json-out");
    if (jsonOutIdx !== -1 && process.argv[jsonOutIdx + 1]) {
      const outPath = path.resolve(process.argv[jsonOutIdx + 1]);
      fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
      console.log(`\nSaved raw JSON benchmark metrics to ${outPath}`);
    }

    console.log("\n=== Benchmark Summary ===");
    console.table([
      {
        Endpoint: "GET /api/leaderboard?period=alltime&limit=20",
        Mode: "Redis OFF (MongoDB)",
        "p50 (ms)": leaderboardOff.p50Ms,
        "p95 (ms)": leaderboardOff.p95Ms,
        "req/s": leaderboardOff.reqPerSec,
        "2xx / Errors": `${leaderboardOff.status2xx} / ${leaderboardOff.non2xx + leaderboardOff.errors}`,
      },
      {
        Endpoint: "GET /api/leaderboard?period=alltime&limit=20",
        Mode: "Redis ON (ZREVRANGE + MGET)",
        "p50 (ms)": leaderboardOn.p50Ms,
        "p95 (ms)": leaderboardOn.p95Ms,
        "req/s": leaderboardOn.reqPerSec,
        "2xx / Errors": `${leaderboardOn.status2xx} / ${leaderboardOn.non2xx + leaderboardOn.errors}`,
      },
      {
        Endpoint: "POST /api/ai/grammar",
        Mode: "Redis OFF (Live Gemini 2.5 Flash)",
        "p50 (ms)": aiOff.p50Ms,
        "p95 (ms)": aiOff.p95Ms,
        "req/s": aiOff.reqPerSec,
        "2xx / Errors": `${aiOff.status2xx} / ${aiOff.non2xx + aiOff.errors}`,
      },
      {
        Endpoint: "POST /api/ai/grammar",
        Mode: "Redis ON (Cache-Aside HIT)",
        "p50 (ms)": aiOn.p50Ms,
        "p95 (ms)": aiOn.p95Ms,
        "req/s": aiOn.reqPerSec,
        "2xx / Errors": `${aiOn.status2xx} / ${aiOn.non2xx + aiOn.errors}`,
      },
    ]);
  } finally {
    // 1. Stop accepting new HTTP requests and drain in-flight autocannon sockets first
    await new Promise((resolve) => server.close(() => resolve()));
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }

    // 2. Clean up temporary Redis keys (only flush when using dedicated logical DB /15) & temporary MongoDB database
    try {
      const client = getRedisClient();
      if (client && process.env.REDIS_URL.endsWith("/15")) {
        await client.flushdb();
      }
    } catch {
      // ignore cleanup errors
    }

    if (mongoose.connection.readyState === 1 && mongoose.connection.name === BENCH_DB_NAME) {
      await mongoose.connection.dropDatabase();
      console.log(`Cleaned up temporary database ${BENCH_DB_NAME}.`);
    }

    await disconnectRedis();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
