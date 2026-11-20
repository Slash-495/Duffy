import path from "node:path";
import { initBenchEnv, backendDir, toFileUrl } from "./setup.js";

const { redisUrl } = initBenchEnv();
process.env.GEMINI_API_KEY = "bench-mock-gemini-api-key";

const { connectRedis, setRedisRuntimeEnabled, disconnectRedis } = await import(
  toFileUrl(path.join(backendDir, "src/lib/redis.js"))
);
const { buildCacheHashKey } = await import(toFileUrl(path.join(backendDir, "src/lib/cache.js")));
const { GeminiAdapter } = await import(toFileUrl(path.join(backendDir, "src/services/ai/GeminiAdapter.js")));
const { GrammarService } = await import(toFileUrl(path.join(backendDir, "src/services/ai/GrammarService.js")));

const CONCURRENCY = 100;
const SIMULATED_UPSTREAM_LATENCY_MS = 50;
const TEST_PROMPT = "She don't likes to goes to school yesterday.";
const TARGET_LANG = "English";

async function runStampedeBenchmark() {
  console.log("================================================================================");
  console.log("BENCHMARK 3: Cold-Cache Stampede Test (GrammarService.checkWithCacheMeta)");
  console.log("================================================================================");
  console.log(`Connecting to Redis at ${redisUrl}...`);

  setRedisRuntimeEnabled(true);
  const redis = await connectRedis();

  if (!redis || redis.status !== "ready") {
    console.error("FAIL: Redis client not ready.");
    process.exit(1);
  }

  let upstreamCallCount = 0;
  const originalGenerateText = GeminiAdapter.prototype.generateText;

  GeminiAdapter.prototype.generateText = async function mockGenerateText() {
    upstreamCallCount += 1;
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_UPSTREAM_LATENCY_MS));
    return JSON.stringify({
      corrected: "She didn't like going to school yesterday.",
      explanation: "Use past tense 'didn't like' with 'yesterday' and gerund 'going'.",
      score: 62,
    });
  };

  const cacheKey = buildCacheHashKey("ai:grammar", {
    message: TEST_PROMPT,
    targetLanguage: TARGET_LANG.toLowerCase(),
  });

  // Ensure completely cold cache
  await redis.del(cacheKey);
  const beforeCold = await redis.get(cacheKey);
  console.log(`Cache Key                  : ${cacheKey}`);
  console.log(`Pre-burst Redis GET        : ${beforeCold === null ? "null (cold cache verified)" : "PRESENT"}`);
  console.log(`Prompt                     : "${TEST_PROMPT}" (${TARGET_LANG})`);
  console.log(`Concurrent Requests        : ${CONCURRENCY}`);
  console.log(`Mocked Gemini Latency      : ${SIMULATED_UPSTREAM_LATENCY_MS} ms\n`);

  // Phase A: Cold-cache concurrent burst (stampede test)
  const coldStart = performance.now();
  const coldResults = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => GrammarService.checkWithCacheMeta(TEST_PROMPT, TARGET_LANG))
  );
  const coldElapsedMs = (performance.now() - coldStart).toFixed(2);
  const coldHits = coldResults.filter((r) => r.hit === true).length;
  const coldMisses = coldResults.filter((r) => r.hit === false).length;
  const coldUpstreamCalls = upstreamCallCount;

  // Phase B: Warm-cache concurrent burst (control check)
  upstreamCallCount = 0;
  const warmStart = performance.now();
  const warmResults = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => GrammarService.checkWithCacheMeta(TEST_PROMPT, TARGET_LANG))
  );
  const warmElapsedMs = (performance.now() - warmStart).toFixed(2);
  const warmHits = warmResults.filter((r) => r.hit === true).length;
  const warmMisses = warmResults.filter((r) => r.hit === false).length;
  const warmUpstreamCalls = upstreamCallCount;

  console.log("| Phase | Concurrent Requests | Cache Hits | Cache Misses | Upstream Gemini Calls | Ideal Calls | Wall Time (ms) |");
  console.log("|-------|---------------------|------------|--------------|-----------------------|-------------|----------------|");
  console.log(
    `| Cold Cache Burst | ${String(CONCURRENCY).padStart(19)} | ${String(coldHits).padStart(10)} | ${String(
      coldMisses
    ).padStart(12)} | ${String(coldUpstreamCalls).padStart(21)} | ${String(1).padStart(11)} | ${String(
      coldElapsedMs
    ).padStart(14)} |`
  );
  console.log(
    `| Warm Cache Burst | ${String(CONCURRENCY).padStart(19)} | ${String(warmHits).padStart(10)} | ${String(
      warmMisses
    ).padStart(12)} | ${String(warmUpstreamCalls).padStart(21)} | ${String(0).padStart(11)} | ${String(
      warmElapsedMs
    ).padStart(14)} |`
  );

  console.log("\nSummary:");
  console.log(
    `- Cold-cache stampede upstream calls: ${coldUpstreamCalls} / ${CONCURRENCY} (ideal with single-flight coalescing: 1)`
  );
  console.log(`- Warm-cache follow-up upstream calls: ${warmUpstreamCalls} / ${CONCURRENCY} (${warmHits} cache hits)`);
  console.log(
    `- Diagnosis: ${
      coldUpstreamCalls > 1
        ? `CACHE STAMPEDE OBSERVED — cacheAside() in backend/src/lib/cache.js lacks in-flight promise deduplication / distributed locking, so all ${coldUpstreamCalls} concurrent callers saw a cache miss before the first write completed.`
        : "No stampede observed (single upstream call)."
    }`
  );

  // Restore prototype & cleanup
  GeminiAdapter.prototype.generateText = originalGenerateText;
  await redis.del(cacheKey);
  await disconnectRedis();
}

runStampedeBenchmark().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
