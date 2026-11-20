import http from "node:http";
import path from "node:path";
import { initBenchEnv, startMongo, stopMongo, requireFromBackend, backendDir, toFileUrl } from "./setup.js";

const { redisUrl } = initBenchEnv();

const express = requireFromBackend("express");
const { connectRedis, setRedisRuntimeEnabled, disconnectRedis } = await import(
  toFileUrl(path.join(backendDir, "src/lib/redis.js"))
);
const { FeatureFlagService } = await import(
  toFileUrl(path.join(backendDir, "src/services/premium/FeatureFlagService.js"))
);
const { createTierRateLimiter } = await import(
  toFileUrl(path.join(backendDir, "src/middleware/rateLimiter.js"))
);

async function runLimiterBenchmark() {
  console.log("================================================================================");
  console.log("BENCHMARK 1: Lua Sliding-Window Rate Limiter Concurrency Benchmark");
  console.log("================================================================================");
  console.log(`Connecting to in-memory MongoDB and Redis at ${redisUrl}...`);

  setRedisRuntimeEnabled(true);
  const { mongod, mongoose } = await startMongo();
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    console.error("FAIL: Redis client not ready.");
    process.exit(1);
  }

  // Set up mock user and read limit L from config
  const testUserId = new mongoose.Types.ObjectId().toString();
  const mockUser = { _id: testUserId, role: "USER" };
  const limits = await FeatureFlagService.getUserLimits(mockUser);
  const L = limits.maxWindowAICalls;

  console.log(`Resolved User Tier: ${limits.tier}`);
  console.log(`Configured Rate Limit (L): ${L} requests per window`);
  console.log(`Firing 100 concurrent requests per trial across 20 independent trials...\n`);

  // Set up Express application with the tier rate limiter
  const app = express();
  const limiter = createTierRateLimiter({ namespace: "ai", windowMs: 60_000 });

  app.use((req, res, next) => {
    req.user = mockUser;
    next();
  });
  app.use(limiter);
  app.get("/api/ai/test", (req, res) => {
    res.status(200).json({ success: true, message: "allowed" });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}/api/ai/test`;

  const key = `ratelimit:ai:${testUserId}`;
  const trials = [];

  for (let trial = 1; trial <= 20; trial++) {
    // Reset the Redis key before each trial
    await redis.del(key);

    // Fire 100 concurrent requests simultaneously
    const start = performance.now();
    const responses = await Promise.all(
      Array.from({ length: 100 }, async () => {
        try {
          const res = await fetch(targetUrl);
          return { status: res.status };
        } catch (err) {
          return { status: 500, error: err.message };
        }
      })
    );
    const durationMs = (performance.now() - start).toFixed(2);

    const admitted = responses.filter((r) => r.status === 200).length;
    const rejected = responses.filter((r) => r.status === 429).length;
    const other = responses.filter((r) => r.status !== 200 && r.status !== 429).length;
    const matched = admitted === L;

    trials.push({
      trial,
      total: 100,
      admitted,
      rejected,
      other,
      expected: L,
      matched,
      durationMs,
    });
  }

  // Print results table
  console.log("| Trial | Total Requests | Admitted (200) | Rejected (429) | Expected (L) | Matched Expected? | Duration (ms) |");
  console.log("|-------|----------------|----------------|----------------|--------------|-------------------|---------------|");
  for (const t of trials) {
    console.log(
      `| ${String(t.trial).padStart(5)} | ${String(t.total).padStart(14)} | ${String(t.admitted).padStart(14)} | ${String(
        t.rejected
      ).padStart(14)} | ${String(t.expected).padStart(12)} | ${String(t.matched ? "YES" : "NO").padStart(17)} | ${String(
        t.durationMs
      ).padStart(13)} |`
    );
  }

  const allMatched = trials.every((t) => t.matched);
  const avgDuration = (trials.reduce((acc, t) => acc + parseFloat(t.durationMs), 0) / trials.length).toFixed(2);

  console.log("\nSummary:");
  console.log(`- Total Trials: ${trials.length}`);
  console.log(`- Trials strictly matching L=${L}: ${trials.filter((t) => t.matched).length} / ${trials.length}`);
  console.log(`- Average batch execution time: ${avgDuration} ms`);
  console.log(`- Overall Result: ${allMatched ? "PASSED (Zero race conditions, exact atomic admission)" : "FAILED"}`);

  // Cleanup
  await redis.del(key);
  server.close();
  await disconnectRedis();
  await stopMongo(mongod, mongoose);
}

runLimiterBenchmark().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
