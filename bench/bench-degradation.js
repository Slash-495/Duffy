import http from "node:http";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { initBenchEnv, startMongo, stopMongo, requireFromBackend, backendDir, toFileUrl } from "./setup.js";

const execAsync = promisify(exec);

const { redisUrl } = initBenchEnv();
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "bench-degradation-secret";
process.env.API_RATE_LIMIT_MAX = "1000000";

const autocannon = requireFromBackend("autocannon");
const jwt = requireFromBackend("jsonwebtoken");

const { connectRedis, setRedisRuntimeEnabled, disconnectRedis } = await import(
  toFileUrl(path.join(backendDir, "src/lib/redis.js"))
);
const { app } = await import(toFileUrl(path.join(backendDir, "src/server.js")));
const User = (await import(toFileUrl(path.join(backendDir, "src/models/User.model.js")))).default;
const LearningProfile = (await import(toFileUrl(path.join(backendDir, "src/models/LearningProfile.js")))).default;
const Leaderboard = (await import(toFileUrl(path.join(backendDir, "src/models/Leaderboard.js")))).default;
const { LeaderboardService, getPeriodKey } = await import(
  toFileUrl(path.join(backendDir, "src/services/leaderboardService.js"))
);

const STOP_CMD =
  process.env.BENCH_REDIS_STOP_CMD ||
  (process.platform === "win32" ? "wsl -u root service redis-server stop" : "service redis-server stop");
const START_CMD =
  process.env.BENCH_REDIS_START_CMD ||
  (process.platform === "win32" ? "wsl -u root service redis-server start" : "service redis-server start");

const SEED_USERS = 500;
const TOTAL_DURATION_SEC = 24;
const STOP_AT_SEC = 6;
const START_AT_SEC = 13;
const CONNECTIONS = 10;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, Math.min(sorted.length - 1, idx))].toFixed(2));
}

function summarize(samples) {
  const count = samples.length;
  const ok2xx = samples.filter((s) => s.statusCode >= 200 && s.statusCode < 300).length;
  const non2xx = count - ok2xx;
  const redisCount = samples.filter((s) => s.source === "redis").length;
  const mongoCount = samples.filter((s) => s.source === "mongodb").length;
  const latencies = samples.map((s) => s.responseTime).sort((a, b) => a - b);
  const mean = latencies.length
    ? Number((latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(2))
    : 0;
  return {
    count,
    ok2xx,
    non2xx,
    non2xxRatePct: count ? Number(((non2xx / count) * 100).toFixed(4)) : 0,
    redisCount,
    mongoCount,
    meanMs: mean,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: latencies.length ? Number(latencies[latencies.length - 1].toFixed(2)) : 0,
  };
}

async function seedLeaderboardData() {
  const now = new Date();
  const weeklyKey = getPeriodKey("WEEKLY", now);
  const users = [];
  const profiles = [];
  const lbDocs = [];

  for (let i = 0; i < SEED_USERS; i++) {
    const u = new User({
      fullName: `Bench User ${i + 1}`,
      email: `bench_deg_${i + 1}@example.com`,
      password: "Password123!",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
      isOnboarded: true,
    });
    users.push(u);
    const xp = (i + 1) * 15;
    profiles.push({
      userId: u._id,
      xp,
      currentStreak: i % 14,
      currentCEFR: "B1",
    });
    lbDocs.push({
      userId: u._id,
      period: "WEEKLY",
      periodKey: weeklyKey,
      xpEarned: xp,
    });
  }

  await User.insertMany(users, { ordered: false });
  await LearningProfile.insertMany(profiles, { ordered: false });
  await Leaderboard.insertMany(lbDocs, { ordered: false });

  await LeaderboardService.rebuildFromMongo(now);

  return users[0];
}

async function runDegradationBenchmark() {
  console.log("================================================================================");
  console.log("BENCHMARK 2: Graceful Degradation Under Autocannon Load (GET /api/leaderboard)");
  console.log("================================================================================");
  console.log(`Redis URL: ${redisUrl}`);
  console.log(`Stop cmd : ${STOP_CMD}`);
  console.log(`Start cmd: ${START_CMD}`);

  // Ensure Redis is started before beginning
  await execAsync(START_CMD);

  setRedisRuntimeEnabled(true);
  const { mongod, mongoose } = await startMongo();
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    console.error("FAIL: Redis client not ready at benchmark start.");
    process.exit(1);
  }

  console.log(`Seeding ${SEED_USERS} users into in-memory MongoDB and warming Redis...`);
  const callerUser = await seedLeaderboardData();
  const token = jwt.sign({ userId: callerUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}/api/leaderboard?period=weekly&limit=20`;

  // Sanity check initial response
  const preCheck = await fetch(targetUrl, { headers: { Authorization: `Bearer ${token}` } });
  const preSource = preCheck.headers.get("x-leaderboard-source");
  console.log(`Pre-flight GET /api/leaderboard -> HTTP ${preCheck.status}, X-Leaderboard-Source: ${preSource}`);
  if (preCheck.status !== 200 || preSource !== "redis") {
    console.error("FAIL: Pre-flight did not return 200 from redis.");
    process.exit(1);
  }

  const samples = [];
  let runStart = 0;
  let stopIssuedAt = null;
  let stopCompletedAt = null;
  let startIssuedAt = null;
  let startCompletedAt = null;
  let redisReadyAfterRestartAt = null;
  let firstMongoAfterStopAt = null;
  let firstRedisAfterRestartAt = null;

  redis.on("ready", () => {
    if (startIssuedAt !== null && redisReadyAfterRestartAt === null) {
      redisReadyAfterRestartAt = performance.now() - runStart;
      console.log(`  [t=${(redisReadyAfterRestartAt / 1000).toFixed(3)}s] ioredis emitted 'ready'`);
    }
  });

  console.log(
    `\nStarting continuous autocannon run (${TOTAL_DURATION_SEC}s, ${CONNECTIONS} concurrent connections)...`
  );
  console.log(`  - Phase 1 (Normal / Redis)    : 0s -> ${STOP_AT_SEC}s`);
  console.log(`  - Redis Stop Trigger          : t = ${STOP_AT_SEC}s`);
  console.log(`  - Phase 2 (Fallback / Mongo)  : ~${STOP_AT_SEC}s -> ${START_AT_SEC}s`);
  console.log(`  - Redis Restart Trigger       : t = ${START_AT_SEC}s`);
  console.log(`  - Phase 3 (Recovery & Normal) : ~${START_AT_SEC}s -> ${TOTAL_DURATION_SEC}s\n`);

  runStart = performance.now();

  // Schedule Redis stop mid-run
  const stopTimer = setTimeout(async () => {
    stopIssuedAt = performance.now() - runStart;
    console.log(`  [t=${(stopIssuedAt / 1000).toFixed(3)}s] Stopping Redis...`);
    try {
      await execAsync(STOP_CMD);
    } catch (e) {
      console.error("Stop command error:", e.message);
    }
    stopCompletedAt = performance.now() - runStart;
    console.log(`  [t=${(stopCompletedAt / 1000).toFixed(3)}s] Redis stop command completed.`);
  }, STOP_AT_SEC * 1000);

  // Schedule Redis restart mid-run
  const startTimer = setTimeout(async () => {
    startIssuedAt = performance.now() - runStart;
    console.log(`  [t=${(startIssuedAt / 1000).toFixed(3)}s] Restarting Redis...`);
    try {
      await execAsync(START_CMD);
    } catch (e) {
      console.error("Start command error:", e.message);
    }
    startCompletedAt = performance.now() - runStart;
    console.log(`  [t=${(startCompletedAt / 1000).toFixed(3)}s] Redis start command completed.`);
  }, START_AT_SEC * 1000);

  const acResult = await new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: targetUrl,
        connections: CONNECTIONS,
        duration: TOTAL_DURATION_SEC,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        setupClient(client) {
          let lastSource = "unknown";
          client.on("headers", (hdrs) => {
            lastSource = "unknown";
            const list = hdrs?.headers || [];
            for (let i = 0; i < list.length; i += 2) {
              if (String(list[i]).toLowerCase() === "x-leaderboard-source") {
                lastSource = String(list[i + 1]);
                break;
              }
            }
          });
          client.on("response", (statusCode, resBytes, responseTime) => {
            const t = performance.now() - runStart;
            samples.push({ t, statusCode, responseTime, source: lastSource });
            if (stopIssuedAt !== null && firstMongoAfterStopAt === null && lastSource === "mongodb") {
              firstMongoAfterStopAt = t;
              console.log(
                `  [t=${(t / 1000).toFixed(3)}s] First HTTP 200 served from MongoDB fallback!`
              );
            }
            if (startIssuedAt !== null && firstRedisAfterRestartAt === null && lastSource === "redis") {
              firstRedisAfterRestartAt = t;
              console.log(
                `  [t=${(t / 1000).toFixed(3)}s] First HTTP 200 served from Redis after restart!`
              );
            }
          });
        },
      },
      (err, res) => {
        if (err) return reject(err);
        resolve(res);
      }
    );
  });

  clearTimeout(stopTimer);
  clearTimeout(startTimer);

  // Segment samples into phases
  const normalBeforeSamples = samples.filter((s) => s.t < STOP_AT_SEC * 1000);
  const fallbackSamples = samples.filter(
    (s) => stopCompletedAt !== null && s.t >= stopCompletedAt && s.t < START_AT_SEC * 1000
  );
  const postRecoverySamples = samples.filter(
    (s) => firstRedisAfterRestartAt !== null && s.t >= firstRedisAfterRestartAt
  );
  const bySourceRedis = samples.filter((s) => s.source === "redis");
  const bySourceMongo = samples.filter((s) => s.source === "mongodb");

  const overall = summarize(samples);
  const normalStats = summarize(normalBeforeSamples);
  const fallbackStats = summarize(fallbackSamples);
  const postRecoveryStats = summarize(postRecoverySamples);
  const redisAllStats = summarize(bySourceRedis);
  const mongoAllStats = summarize(bySourceMongo);

  const failoverMs =
    firstMongoAfterStopAt !== null && stopIssuedAt !== null
      ? Number((firstMongoAfterStopAt - stopIssuedAt).toFixed(1))
      : null;
  const recoveryFromStartIssuedMs =
    firstRedisAfterRestartAt !== null && startIssuedAt !== null
      ? Number((firstRedisAfterRestartAt - startIssuedAt).toFixed(1))
      : null;
  const recoveryFromStartCompletedMs =
    firstRedisAfterRestartAt !== null && startCompletedAt !== null
      ? Number((firstRedisAfterRestartAt - startCompletedAt).toFixed(1))
      : null;
  const ioredisReadyFromStartCompletedMs =
    redisReadyAfterRestartAt !== null && startCompletedAt !== null
      ? Number((redisReadyAfterRestartAt - startCompletedAt).toFixed(1))
      : null;

  console.log("\n--- Autocannon Overall Summary ---");
  console.log(`Total Requests : ${acResult.requests.total}`);
  console.log(`2xx Responses  : ${acResult["2xx"]}`);
  console.log(`Non-2xx        : ${acResult.non2xx}`);
  console.log(`Errors         : ${acResult.errors}`);
  console.log(`Timeouts       : ${acResult.timeouts}`);
  console.log(`Avg Req/sec    : ${acResult.requests.average}`);
  console.log(`Overall Latency: mean=${acResult.latency.mean}ms p50=${acResult.latency.p50}ms p97.5=${acResult.latency.p97_5}ms p99=${acResult.latency.p99}ms`);

  console.log("\n--- Phase Breakdown (Recorded Per-Response Samples) ---");
  console.log(
    "| Phase / Source | Requests | 2xx | Non-2xx | Non-2xx Rate | Redis Hits | Mongo Hits | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |"
  );
  console.log(
    "|----------------|----------|-----|---------|--------------|------------|------------|-----------|----------|----------|----------|----------|"
  );
  const rows = [
    ["Phase 1: Normal (0-6s)", normalStats],
    ["Phase 2: Fallback (Redis down)", fallbackStats],
    ["Phase 3: Post-Recovery (Redis up)", postRecoveryStats],
    ["All X-Leaderboard-Source: redis", redisAllStats],
    ["All X-Leaderboard-Source: mongodb", mongoAllStats],
    ["All Responses (Full 24s Run)", overall],
  ];
  for (const [label, st] of rows) {
    console.log(
      `| ${label.padEnd(33)} | ${String(st.count).padStart(8)} | ${String(st.ok2xx).padStart(3)} | ${String(
        st.non2xx
      ).padStart(7)} | ${String(st.non2xxRatePct + "%").padStart(12)} | ${String(st.redisCount).padStart(
        10
      )} | ${String(st.mongoCount).padStart(10)} | ${String(st.meanMs).padStart(9)} | ${String(st.p50Ms).padStart(
        8
      )} | ${String(st.p95Ms).padStart(8)} | ${String(st.p99Ms).padStart(8)} | ${String(st.maxMs).padStart(8)} |`
    );
  }

  console.log("\n--- Failover & Recovery Timings ---");
  console.log(`- Redis stop issued at          : ${stopIssuedAt?.toFixed(1)} ms`);
  console.log(`- Redis stop completed at       : ${stopCompletedAt?.toFixed(1)} ms`);
  console.log(`- First Mongo fallback response : ${firstMongoAfterStopAt?.toFixed(1)} ms (failover from stop issued: ${failoverMs} ms)`);
  console.log(`- Redis start issued at         : ${startIssuedAt?.toFixed(1)} ms`);
  console.log(`- Redis start completed at      : ${startCompletedAt?.toFixed(1)} ms`);
  console.log(`- ioredis 'ready' event at      : ${redisReadyAfterRestartAt?.toFixed(1)} ms (${ioredisReadyFromStartCompletedMs} ms after start completed)`);
  console.log(
    `- First Redis response after restart: ${firstRedisAfterRestartAt?.toFixed(1)} ms (${recoveryFromStartCompletedMs} ms after start completed; ${recoveryFromStartIssuedMs} ms after start issued)`
  );

  // Cleanup & ensure Redis is left running
  await new Promise((resolve) => {
    server.close(resolve);
    if (typeof server.closeIdleConnections === "function") {
      server.closeIdleConnections();
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  await disconnectRedis();
  await stopMongo(mongod, mongoose);
  try {
    await execAsync(START_CMD);
  } catch {}
}

runDegradationBenchmark().catch(async (err) => {
  console.error("Benchmark error:", err);
  try {
    await execAsync(START_CMD);
  } catch {}
  process.exit(1);
});
