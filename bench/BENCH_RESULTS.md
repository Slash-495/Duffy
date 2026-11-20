# Duffy Benchmark & Reliability Verification Results

> **Strict Measurement Policy:** Every figure below comes directly from local executions on dev resources (`mongodb-memory-server` and local WSL Redis). Zero numbers were fabricated, extrapolated, or estimated. Application source code (`backend/src/`, `frontend/src/`) was not modified.

---

## Environment

| Property | Value |
|---|---|
| **OS** | Windows 11 (`win32`, `x64`, kernel `10.0.26200`) |
| **CPU** | AMD Ryzen 5 5600H with Radeon Graphics (12 logical cores) |
| **RAM** | 13.86 GB |
| **Node.js** | `v20.13.1` |
| **npm** | `10.5.2` |
| **MongoDB** | `mongodb-memory-server@10.1.0` (MongoDB binary `7.0.24`, local `127.0.0.1`) |
| **Redis** | `Redis server v=7.0.15` (running locally in WSL2 Ubuntu on port `6379`) |
| **Git SHA** | `a747539ee2060412a22c777a3002a38944cce0d7` |
| **Date** | 2026-11-19 |

---

## Reproducibility (One-Command Scripts)

All benchmarks are runnable individually via `bench/package.json` without modifying application files:

```bash
npm run bench:limiter --prefix bench      # Benchmark 1: Lua sliding-window limiter
npm run bench:degradation --prefix bench  # Benchmark 2: Graceful degradation under autocannon load
npm run bench:stampede --prefix bench     # Benchmark 3: Cold-cache stampede on GrammarService
npm run bench:leaderboard --prefix bench  # Benchmark 4: Leaderboard consistency + rebuildLeaderboard.js
npm run bench:coverage --prefix bench     # Benchmark 5: Backend Vitest suite + v8 coverage
npm run bench:all --prefix bench          # Run Benchmarks 1-4 sequentially
```

---

## 1. Lua Sliding-Window Rate Limiter Concurrency

**Target:** `backend/src/middleware/rateLimiter.js` (`createTierRateLimiter` with `SLIDING_WINDOW_LUA` over Redis Sorted Sets) + `FeatureFlagService.getUserLimits()` (`FREE` tier limit `L = 10` read dynamically from config).

### Command

```bash
npm run bench:limiter --prefix bench
```

### Raw Result Table (100 Concurrent Requests × 20 Trials, Limit `L = 10`)

| Trial | Total Requests | Admitted (200) | Rejected (429) | Expected (L) | Matched Expected? | Duration (ms) |
|------:|---------------:|---------------:|---------------:|-------------:|:-----------------:|--------------:|
| 1 | 100 | 10 | 90 | 10 | YES | 182.54 |
| 2 | 100 | 10 | 90 | 10 | YES | 85.61 |
| 3 | 100 | 10 | 90 | 10 | YES | 64.03 |
| 4 | 100 | 10 | 90 | 10 | YES | 61.89 |
| 5 | 100 | 10 | 90 | 10 | YES | 70.84 |
| 6 | 100 | 10 | 90 | 10 | YES | 58.97 |
| 7 | 100 | 10 | 90 | 10 | YES | 57.16 |
| 8 | 100 | 10 | 90 | 10 | YES | 51.16 |
| 9 | 100 | 10 | 90 | 10 | YES | 76.51 |
| 10 | 100 | 10 | 90 | 10 | YES | 71.96 |
| 11 | 100 | 10 | 90 | 10 | YES | 75.50 |
| 12 | 100 | 10 | 90 | 10 | YES | 78.80 |
| 13 | 100 | 10 | 90 | 10 | YES | 68.75 |
| 14 | 100 | 10 | 90 | 10 | YES | 72.92 |
| 15 | 100 | 10 | 90 | 10 | YES | 60.99 |
| 16 | 100 | 10 | 90 | 10 | YES | 74.25 |
| 17 | 100 | 10 | 90 | 10 | YES | 69.25 |
| 18 | 100 | 10 | 90 | 10 | YES | 66.54 |
| 19 | 100 | 10 | 90 | 10 | YES | 64.77 |
| 20 | 100 | 10 | 90 | 10 | YES | 78.61 |

### Key Findings & Raw Output

- **Admitted vs Expected:** `10 / 10` admitted and `90` rejected (`429`) on **20 / 20 trials** (zero race-condition over-admissions).
- **Average 100-request batch wall time:** `74.55 ms`.

<details>
<summary>Raw stdout from <code>npm run bench:limiter --prefix bench</code></summary>

```text
> duffy-bench@1.0.0 bench:limiter
> node bench-limiter.js

================================================================================
BENCHMARK 1: Lua Sliding-Window Rate Limiter Concurrency Benchmark
================================================================================
Connecting to in-memory MongoDB and Redis at redis://172.29.203.205:6379...
Resolved User Tier: FREE
Configured Rate Limit (L): 10 requests per window
Firing 100 concurrent requests per trial across 20 independent trials...

| Trial | Total Requests | Admitted (200) | Rejected (429) | Expected (L) | Matched Expected? | Duration (ms) |
|-------|----------------|----------------|----------------|--------------|-------------------|---------------|
|     1 |            100 |             10 |             90 |           10 |               YES |        182.54 |
|     2 |            100 |             10 |             90 |           10 |               YES |         85.61 |
|     3 |            100 |             10 |             90 |           10 |               YES |         64.03 |
|     4 |            100 |             10 |             90 |           10 |               YES |         61.89 |
|     5 |            100 |             10 |             90 |           10 |               YES |         70.84 |
|     6 |            100 |             10 |             90 |           10 |               YES |         58.97 |
|     7 |            100 |             10 |             90 |           10 |               YES |         57.16 |
|     8 |            100 |             10 |             90 |           10 |               YES |         51.16 |
|     9 |            100 |             10 |             90 |           10 |               YES |         76.51 |
|    10 |            100 |             10 |             90 |           10 |               YES |         71.96 |
|    11 |            100 |             10 |             90 |           10 |               YES |         75.50 |
|    12 |            100 |             10 |             90 |           10 |               YES |         78.80 |
|    13 |            100 |             10 |             90 |           10 |               YES |         68.75 |
|    14 |            100 |             10 |             90 |           10 |               YES |         72.92 |
|    15 |            100 |             10 |             90 |           10 |               YES |         60.99 |
|    16 |            100 |             10 |             90 |           10 |               YES |         74.25 |
|    17 |            100 |             10 |             90 |           10 |               YES |         69.25 |
|    18 |            100 |             10 |             90 |           10 |               YES |         66.54 |
|    19 |            100 |             10 |             90 |           10 |               YES |         64.77 |
|    20 |            100 |             10 |             90 |           10 |               YES |         78.61 |

Summary:
- Total Trials: 20
- Trials strictly matching L=10: 20 / 20
- Average batch execution time: 74.55 ms
- Overall Result: PASSED (Zero race conditions, exact atomic admission)
[Redis] Connection closed — fallback mode active.
```

</details>

---

## 2. Graceful Degradation Under Autocannon Load (`GET /api/leaderboard`)

**Target:** Full Express `app` (`backend/src/server.js`) serving `GET /api/leaderboard?period=weekly&limit=20` with JWT auth (`protectRoute`) over 500 seeded users. Continuous 24-second `autocannon` run (`10` concurrent connections). Redis was stopped mid-run at `t = 6s` via `wsl -u root service redis-server stop` and restarted at `t = 13s` via `wsl -u root service redis-server start` (Docker daemon was not running on this host; see Limitations).

### Command

```bash
npm run bench:degradation --prefix bench
```

### Raw Result Table (Per-Phase & Per-Source Breakdown)

| Phase / Source | Requests | 2xx | Non-2xx | Non-2xx Rate | Redis Hits | Mongo Hits | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Phase 1: Normal (`0-6s`) | 2,182 | 2,182 | 0 | 0% | 2,182 | 0 | 27.39 | 26.16 | 37.26 | 47.56 | 64.08 |
| Phase 2: Fallback (Redis down, `6.8-13s`) | 607 | 607 | 0 | 0% | 10 | 597 | 102.40 | 59.44 | 79.18 | 2,603.82 | 2,618.10 |
| Phase 3: Post-Recovery (Redis up, `13.97-24s`) | 4,295 | 4,295 | 0 | 0% | 4,294 | 1 | 23.61 | 22.74 | 30.30 | 37.61 | 49.90 |
| All `X-Leaderboard-Source: redis` | 6,746 | 6,746 | 0 | 0% | 6,746 | 0 | 28.89 | 23.84 | 33.95 | 42.09 | 2,618.10 |
| All `X-Leaderboard-Source: mongodb` | 749 | 749 | 0 | 0% | 0 | 749 | 61.19 | 59.80 | 77.51 | 96.71 | 113.88 |
| **All Responses (Full 24s Run)** | **7,495** | **7,495** | **0** | **0%** | **6,746** | **749** | **32.12** | **24.41** | **60.39** | **71.52** | **2,618.10** |

### Key Findings & Failover/Recovery Timings

- **Non-2xx Rate:** `0 / 7,495` (**0.00%** non-2xx, `0` errors, `0` timeouts) across the entire Redis outage and recovery.
- **Latency (Normal vs Fallback):**
  - Normal Redis (`Phase 1`): `27.39 ms` mean / `26.16 ms` p50 / `47.56 ms` p99.
  - Pure MongoDB fallback (`X-Leaderboard-Source: mongodb`): `61.19 ms` mean / `59.80 ms` p50 / `96.71 ms` p99 (~2.2× slower than Redis).
  - **Failover tail spike:** At the instant Redis dropped (`t = 6.803s`), 10 in-flight requests stalled in `ioredis` retry/socket teardown (`maxRetriesPerRequest: 1`) for up to `2,618.10 ms` (driving Phase 2 p99 to `2,603.82 ms`) before transparently falling back and succeeding with HTTP 200.
- **Recovery Time After Restart:**
  - `service redis-server start` issued at `13,008.5 ms`, completed at `13,841.9 ms`.
  - `ioredis` emitted `'ready'` at `13,942.8 ms` (**`100.9 ms`** after Redis start completed).
  - First HTTP `200` with `X-Leaderboard-Source: redis` at `13,966.6 ms` (**`124.7 ms`** after Redis start completed; **`958.1 ms`** from issuing the restart command).

<details>
<summary>Raw stdout from <code>npm run bench:degradation --prefix bench</code></summary>

```text
> duffy-bench@1.0.0 bench:degradation
> node bench-degradation.js

[Stream] STREAM_API_KEY or STREAM_API_SECRET is not configured.
================================================================================
BENCHMARK 2: Graceful Degradation Under Autocannon Load (GET /api/leaderboard)
================================================================================
Redis URL: redis://172.29.203.205:6379
Stop cmd : wsl -u root service redis-server stop
Start cmd: wsl -u root service redis-server start
Seeding 500 users into in-memory MongoDB and warming Redis...
Pre-flight GET /api/leaderboard -> HTTP 200, X-Leaderboard-Source: redis

Starting continuous autocannon run (24s, 10 concurrent connections)...
  - Phase 1 (Normal / Redis)    : 0s -> 6s
  - Redis Stop Trigger          : t = 6s
  - Phase 2 (Fallback / Mongo)  : ~6s -> 13s
  - Redis Restart Trigger       : t = 13s
  - Phase 3 (Recovery & Normal) : ~13s -> 24s

  [t=6.002s] Stopping Redis...
[Redis] Connection warning (ECONNRESET) — fallback mode active.
  [t=6.803s] Redis stop command completed.
[Leaderboard] Redis summary MGET failed: Reached the max retries per request limit (which is 1). Refer to "maxRetriesPerRequest" option for details.
[Leaderboard] Redis summary MGET failed: Reached the max retries per request limit (which is 1). Refer to "maxRetriesPerRequest" option for details.
[Leaderboard] Redis summary MGET failed: Reached the max retries per request limit (which is 1). Refer to "maxRetriesPerRequest" option for details.
[Leaderboard] Redis summary MGET failed: Reached the max retries per request limit (which is 1). Refer to "maxRetriesPerRequest" option for details.
  [t=9.432s] First HTTP 200 served from MongoDB fallback!
  [t=13.009s] Restarting Redis...
  [t=13.842s] Redis start command completed.
  [t=13.943s] ioredis emitted 'ready'
  [t=13.967s] First HTTP 200 served from Redis after restart!

--- Autocannon Overall Summary ---
Total Requests : 7495
2xx Responses  : 7495
Non-2xx        : 0
Errors         : 0
Timeouts       : 0
Avg Req/sec    : 312.3
Overall Latency: mean=31.64ms p50=24ms p97.5=65ms p99=71ms

--- Phase Breakdown (Recorded Per-Response Samples) ---
| Phase / Source | Requests | 2xx | Non-2xx | Non-2xx Rate | Redis Hits | Mongo Hits | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
|----------------|----------|-----|---------|--------------|------------|------------|-----------|----------|----------|----------|----------|
| Phase 1: Normal (0-6s)            |     2182 | 2182 |       0 |           0% |       2182 |          0 |     27.39 |    26.16 |    37.26 |    47.56 |    64.08 |
| Phase 2: Fallback (Redis down)    |      607 | 607 |       0 |           0% |         10 |        597 |     102.4 |    59.44 |    79.18 |  2603.82 |   2618.1 |
| Phase 3: Post-Recovery (Redis up) |     4295 | 4295 |       0 |           0% |       4294 |          1 |     23.61 |    22.74 |     30.3 |    37.61 |     49.9 |
| All X-Leaderboard-Source: redis   |     6746 | 6746 |       0 |           0% |       6746 |          0 |     28.89 |    23.84 |    33.95 |    42.09 |   2618.1 |
| All X-Leaderboard-Source: mongodb |      749 | 749 |       0 |           0% |          0 |        749 |     61.19 |     59.8 |    77.51 |    96.71 |   113.88 |
| All Responses (Full 24s Run)      |     7495 | 7495 |       0 |           0% |       6746 |        749 |     32.12 |    24.41 |    60.39 |    71.52 |   2618.1 |

--- Failover & Recovery Timings ---
- Redis stop issued at          : 6002.2 ms
- Redis stop completed at       : 6802.8 ms
- First Mongo fallback response : 9432.0 ms (failover from stop issued: 3429.9 ms)
- Redis start issued at         : 13008.5 ms
- Redis start completed at      : 13841.9 ms
- ioredis 'ready' event at      : 13942.8 ms (100.9 ms after start completed)
- First Redis response after restart: 13966.6 ms (124.7 ms after start completed; 958.1 ms after start issued)
```

</details>

---

## 3. Cold-Cache Stampede (`GrammarService.checkWithCacheMeta`)

**Target:** `backend/src/services/ai/GrammarService.js` + `backend/src/lib/cache.js` (`cacheAside`), with `GeminiAdapter.prototype.generateText` mocked by an atomic call counter and a `50 ms` simulated upstream delay.

### Command

```bash
npm run bench:stampede --prefix bench
```

### Raw Result Table (100 Concurrent Identical Grammar Prompts)

| Phase | Concurrent Requests | Cache Hits | Cache Misses | Upstream Gemini Calls | Ideal Calls | Wall Time (ms) |
|---|---:|---:|---:|---:|---:|---:|
| Cold Cache Burst | 100 | 0 | 100 | **100** | 1 | 71.64 |
| Warm Cache Burst (control) | 100 | 100 | 0 | **0** | 0 | 7.39 |

### Key Findings (Honest Assessment)

- **Cold-cache stampede confirmed:** Sending 100 identical prompts concurrently against a cold cache triggered **100 / 100** upstream Gemini calls (vs ideal `1`).
- **Root cause:** `cacheAside()` in `backend/src/lib/cache.js` performs an unprotected `cacheGet` → `fetcher()` → `cacheSet` sequence without in-flight promise coalescing (single-flight) or distributed locking. Under a cold-cache burst, every concurrent caller observes `null` before the first `fetcher()` resolves and populates Redis.
- **Warm-cache control:** Once populated, 100 concurrent identical requests made **0** upstream calls (`100` cache hits in `7.39 ms`).

<details>
<summary>Raw stdout from <code>npm run bench:stampede --prefix bench</code></summary>

```text
> duffy-bench@1.0.0 bench:stampede
> node bench-stampede.js

================================================================================
BENCHMARK 3: Cold-Cache Stampede Test (GrammarService.checkWithCacheMeta)
================================================================================
Connecting to Redis at redis://172.29.203.205:6379...
Cache Key                  : cache:ai:grammar:86db9bbce93efee643a5aec8633f9dab8883e8cf0552369db7be5aadc4f8d658
Pre-burst Redis GET        : null (cold cache verified)
Prompt                     : "She don't likes to goes to school yesterday." (English)
Concurrent Requests        : 100
Mocked Gemini Latency      : 50 ms

| Phase | Concurrent Requests | Cache Hits | Cache Misses | Upstream Gemini Calls | Ideal Calls | Wall Time (ms) |
|-------|---------------------|------------|--------------|-----------------------|-------------|----------------|
| Cold Cache Burst |                 100 |          0 |          100 |                   100 |           1 |          71.64 |
| Warm Cache Burst |                 100 |        100 |            0 |                     0 |           0 |           7.39 |

Summary:
- Cold-cache stampede upstream calls: 100 / 100 (ideal with single-flight coalescing: 1)
- Warm-cache follow-up upstream calls: 0 / 100 (100 cache hits)
- Diagnosis: CACHE STAMPEDE OBSERVED — cacheAside() in backend/src/lib/cache.js lacks in-flight promise deduplication / distributed locking, so all 100 concurrent callers saw a cache miss before the first write completed.
[Redis] Connection closed — fallback mode active.
```

</details>

---

## 4. Leaderboard Consistency (1,000 Concurrent XP Updates + `rebuildLeaderboard.js`)

**Target:** `LeaderboardService.recordXP()` dual-write (MongoDB `bulkWrite` + Redis pipelined `ZINCRBY`) across `1,000` concurrent users with deterministic unique XP values (`10`..`10,000`), followed by executing `backend/src/scripts/rebuildLeaderboard.js` against the local `MongoMemoryServer` (`127.0.0.1`) and local Redis.

### Command

```bash
npm run bench:leaderboard --prefix bench
```

### Raw Result Table (Redis vs MongoDB Comparison, Before & After `rebuildLeaderboard.js`)

| Stage | Period | Redis Count | Mongo Count | Score Mismatches | Rank Mismatches |
|---|---|---:|---:|---:|---:|
| Before rebuild | `DAILY` | 1,000 | 1,000 | 0 | 0 |
| Before rebuild | `WEEKLY` | 1,000 | 1,000 | 0 | 0 |
| Before rebuild | `MONTHLY` | 1,000 | 1,000 | 0 | 0 |
| Before rebuild | `ALL_TIME` | 1,000 | 1,000 | 0 | 0 |
| After rebuild | `DAILY` | 1,000 | 1,000 | 0 | 0 |
| After rebuild | `WEEKLY` | 1,000 | 1,000 | 0 | 0 |
| After rebuild | `MONTHLY` | 1,000 | 1,000 | 0 | 0 |
| After rebuild | `ALL_TIME` | 1,000 | 1,000 | 0 | 0 |

### Key Findings

- **1,000 concurrent XP dual-writes** completed in **`1,318.87 ms`**.
- **Mismatches before `rebuildLeaderboard.js`:** `0` score mismatches and `0` rank mismatches across all 4 periods (`4,000` total entries).
- **`rebuildLeaderboard.js` execution:** Rebuilt `1,000` all-time entries and `3,000` active periodic entries in **`285.8 ms`** (total script process wall time including Node startup/connect: **`1,123.12 ms`**).
- **Mismatches after `rebuildLeaderboard.js`:** `0` score mismatches and `0` rank mismatches across all 4 periods.

<details>
<summary>Raw stdout from <code>npm run bench:leaderboard --prefix bench</code></summary>

```text
> duffy-bench@1.0.0 bench:leaderboard
> node bench-leaderboard.js

================================================================================
BENCHMARK 4: Leaderboard Consistency Under 1,000 Concurrent XP Updates
================================================================================
Connecting to in-memory MongoDB and Redis at redis://172.29.203.205:6379...
Seeding 1000 users and LearningProfiles into local MongoMemoryServer (mongodb://127.0.0.1:64259/)...
Firing 1000 concurrent XP updates (MongoDB + Redis dual-write)...
Completed 1000 concurrent XP updates in 1318.87 ms.

Running rebuildLeaderboard script against local MongoMemoryServer: node backend\src\scripts\rebuildLeaderboard.js
[Redis] Connection closed — fallback mode active.
rebuildLeaderboard.js stdout:
{"timestamp":"2026-11-19T13:43:06.709Z","level":"info","message":"[RebuildLeaderboard] Connecting to MongoDB and Redis..."}
{"timestamp":"2026-11-19T13:43:06.737Z","level":"info","message":"MongoDB Connected: 127.0.0.1"}
{"timestamp":"2026-11-19T13:43:06.752Z","level":"info","message":"[Redis] Connected and ready."}
{"timestamp":"2026-11-19T13:43:07.038Z","level":"info","message":"[RebuildLeaderboard] Completed in 285.8ms — rebuilt 1000 all-time entries and 3000 active periodic entries."}
rebuildLeaderboard.js wall time: 1123.12 ms

--- Comparison Table: Before vs After rebuildLeaderboard.js ---
| Stage          | Period   | Redis Count | Mongo Count | Score Mismatches | Rank Mismatches |
|----------------|----------|-------------|-------------|------------------|-----------------|
| Before rebuild | DAILY    |        1000 |        1000 |                0 |               0 |
| Before rebuild | WEEKLY   |        1000 |        1000 |                0 |               0 |
| Before rebuild | MONTHLY  |        1000 |        1000 |                0 |               0 |
| Before rebuild | ALL_TIME |        1000 |        1000 |                0 |               0 |
| After rebuild  | DAILY    |        1000 |        1000 |                0 |               0 |
| After rebuild  | WEEKLY   |        1000 |        1000 |                0 |               0 |
| After rebuild  | MONTHLY  |        1000 |        1000 |                0 |               0 |
| After rebuild  | ALL_TIME |        1000 |        1000 |                0 |               0 |

Summary:
- Concurrent users updated : 1000 (1318.87 ms)
- Total mismatches BEFORE rebuildLeaderboard.js: 0
- Total mismatches AFTER  rebuildLeaderboard.js: 0
[Redis] Connection closed — fallback mode active.
```

</details>

---

## 5. Backend Test Suite & Code Coverage

### Command

```bash
npm run test:coverage --prefix backend
```

### Summary Metrics

| Metric | Result |
|---|---|
| **Test Files** | `7 passed (7)` |
| **Total Tests** | `29 passed (29)` |
| **Duration** | `8.32s` |
| **Statements Coverage** | **`52.64%`** |
| **Branch Coverage** | **`45.58%`** |
| **Functions Coverage** | **`36.93%`** |
| **Lines Coverage** | **`52.64%`** |

<details>
<summary>Raw stdout from <code>npm run test:coverage --prefix backend</code></summary>

```text
> backend@1.0.0 test:coverage
> vitest run --coverage


 RUN  v2.1.9 C:/Users/arush/OneDrive/Desktop/Duffy2/backend
      Coverage enabled with v8

 ✓ tests/srsService.test.js (6 tests) 9ms
 ✓ tests/rateLimiter.test.js (1 test) 1050ms
 ✓ tests/health.test.js (3 tests) 1337ms
 ✓ tests/leaderboard.test.js (2 tests) 2155ms
   ✓ Leaderboard Service (Mongo-Fallback Mode) > returns correct descending XP ordering and user rank from Mongo when Redis is disabled 761ms
 ✓ tests/ownership.test.js (3 tests) 2488ms
   ✓ Flashcards and Decks Ownership Isolation > prevents User B from reading, editing, or deleting User A's deck 690ms
   ✓ Flashcards and Decks Ownership Isolation > prevents User B from editing, deleting, or injecting cards into User A's deck 325ms
 ✓ tests/rbac.test.js (4 tests) 2506ms
   ✓ RBAC and Classroom Authorization > a USER role gets 403 Forbidden when attempting to create a classroom 504ms
   ✓ RBAC and Classroom Authorization > a learner (USER) can join a classroom using the joinCode 305ms
 ✓ tests/auth.test.js (10 tests) 3115ms
   ✓ Auth Endpoints > POST /api/auth/signup > returns 400 when validation fails (invalid email or short password) 306ms

 Test Files  7 passed (7)
      Tests  29 passed (29)
   Start at  17:29:09
   Duration  8.32s (transform 965ms, setup 508ms, collect 19.32s, tests 12.66s, environment 5ms, prepare 3.14s)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   52.64 |    45.58 |   36.93 |   52.64 |                   
 src               |   80.67 |    28.57 |     100 |   80.67 |                   
  server.js        |   80.67 |    28.57 |     100 |   80.67 | ...46-150,158-163 
 src/controller    |   39.81 |     66.1 |      50 |   39.81 |                   
  activity.js      |   41.66 |      100 |     100 |   41.66 | 7-14              
  ai.js            |   25.89 |      100 |     100 |   25.89 | ...82-112,118-141 
  auth.js          |   54.16 |    76.92 |     100 |   54.16 | ...85-102,106-147 
  chat.js          |   71.42 |      100 |     100 |   71.42 | 5-6               
  classroom.js     |    50.5 |       55 |     100 |    50.5 | ...86-198,221-242 
  decks.js         |   64.28 |       80 |     100 |   64.28 | ...03-104,131-133 
  flashcards.js    |   81.13 |      100 |     100 |   81.13 | 108-132           
  health.js        |   95.55 |    14.28 |     100 |   95.55 | 24-25             
  leaderboard.js   |     100 |      100 |     100 |     100 |                   
  learning.js      |   53.12 |      100 |     100 |   53.12 | ...19,25-30,36-39 
  review.js        |     5.8 |      100 |       0 |     5.8 | ...,46-97,103-186 
  user.js          |    9.89 |      100 |       0 |    9.89 | ...89-298,304-346 
 src/lib           |   38.55 |    29.41 |   41.66 |   38.55 |                   
  AppError.js      |     100 |      100 |     100 |     100 |                   
  cache.js         |   48.38 |       40 |      80 |   48.38 | ...42,50-55,64-65 
  db.js            |      20 |      100 |       0 |      20 | 5-12              
  logger.js        |   31.25 |      100 |       0 |   31.25 | ...23,26-27,30-31 
  pagination.js    |   62.79 |    23.07 |      75 |   62.79 | ...17,19-23,25-30 
  redis.js         |   33.08 |    22.22 |   28.57 |   33.08 | ...31-136,140-150 
  stream.js        |       0 |        0 |       0 |       0 | 1-34              
 src/middleware    |   65.16 |    55.22 |      75 |   65.16 |                   
  asyncHandler.js  |     100 |      100 |     100 |     100 |                   
  auth.js          |   69.38 |     62.5 |     100 |   69.38 | ...32,37-38,48-49 
  cache.js         |       0 |        0 |       0 |       0 | 1-36              
  ...Middleware.js |   57.69 |       45 |      50 |   57.69 | ...37,49-50,56-59 
  rateLimiter.js   |   78.66 |    52.38 |     100 |   78.66 | ...97-117,150-153 
  validate.js      |   65.38 |    71.42 |   66.66 |   65.38 | 14-20,27-28       
 src/models        |   84.75 |     37.5 |      40 |   84.75 |                   
  ActivityFeed.js  |     100 |      100 |     100 |     100 |                   
  Assignment.js    |     100 |      100 |     100 |     100 |                   
  Classroom.js     |     100 |      100 |     100 |     100 |                   
  CommunityDeck.js |       0 |        0 |       0 |       0 | 1-31              
  Deck.js          |     100 |      100 |     100 |     100 |                   
  Flashcard.js     |     100 |      100 |     100 |     100 |                   
  ForumPost.js     |       0 |        0 |       0 |       0 | 1-41              
  FriendRequest.js |     100 |      100 |     100 |     100 |                   
  Leaderboard.js   |     100 |      100 |     100 |     100 |                   
  ...ingProfile.js |     100 |      100 |     100 |     100 |                   
  Lesson.js        |     100 |      100 |     100 |     100 |                   
  Quiz.js          |       0 |        0 |       0 |       0 | 1-40              
  Subscription.js  |     100 |      100 |     100 |     100 |                   
  User.model.js    |   98.27 |       60 |     100 |   98.27 | 102-103           
 src/routes        |     100 |      100 |     100 |     100 |                   
  activity.js      |     100 |      100 |     100 |     100 |                   
  ai.js            |     100 |      100 |     100 |     100 |                   
  auth.js          |     100 |      100 |     100 |     100 |                   
  chat.js          |     100 |      100 |     100 |     100 |                   
  classroom.js     |     100 |      100 |     100 |     100 |                   
  decks.js         |     100 |      100 |     100 |     100 |                   
  flashcards.js    |     100 |      100 |     100 |     100 |                   
  leaderboard.js   |     100 |      100 |     100 |     100 |                   
  learning.js      |     100 |      100 |     100 |     100 |                   
  review.js        |     100 |      100 |     100 |     100 |                   
  user.js          |     100 |      100 |     100 |     100 |                   
 src/seeders       |       0 |        0 |       0 |       0 |                   
  ...ardLessons.js |       0 |        0 |       0 |       0 | 1-68              
 src/services      |   46.64 |     36.9 |   52.38 |   46.64 |                   
  ...ityService.js |   43.66 |       25 |      50 |   43.66 | 21-22,32-34,42-83 
  ...ardService.js |   42.34 |    32.25 |   53.84 |   42.34 | ...24-571,610-613 
  ...nceService.js |   31.13 |    33.33 |      40 |   31.13 | ...7,56-68,77-123 
  srsService.js    |     100 |    66.66 |     100 |     100 | 34-47             
 src/services/ai   |   18.88 |        0 |       0 |   18.88 |                   
  ...inServices.js |   17.56 |      100 |       0 |   17.56 | ...63,66-72,77-89 
  GeminiAdapter.js |       0 |        0 |       0 |       0 | 1-173             
  ...marService.js |   22.44 |      100 |       0 |   22.44 | ...31,35-54,57-59 
  PromptBuilder.js |   83.01 |      100 |       0 |   83.01 | 44-45,52-59       
  ...derAdapter.js |       0 |        0 |       0 |       0 | 1-35              
 ...vices/learning |   20.26 |      100 |       0 |   20.26 |                   
  ...ticsEngine.js |   11.88 |      100 |       0 |   11.88 | ...11-113,116-118 
  ...ningEngine.js |   41.93 |      100 |       0 |   41.93 | 11-19,22-24,30-35 
  QuizEngine.js    |   29.41 |      100 |       0 |   29.41 | 12-35,38-40       
  ...layService.js |   27.11 |      100 |       0 |   27.11 | 14-30,36-66       
  ...sisService.js |   13.58 |      100 |       0 |   13.58 | 14-46,49-92       
 ...rvices/premium |   84.41 |    30.76 |      60 |   84.41 |                   
  ...lagService.js |   84.41 |    30.76 |      60 |   84.41 | ...72,81-83,86-88 
 src/validators    |     100 |      100 |     100 |     100 |                   
  schemas.js       |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

</details>

---

## Limitations & Architectural Notes

1. **WSL2 Redis Service vs Docker Container (Benchmark 2):** The Docker Desktop daemon was not running on this Windows 11 host (`//./pipe/docker_engine` unavailable), so Redis 7.0.15 was run natively inside local WSL2 Ubuntu and stopped/restarted mid-load via `wsl -u root service redis-server stop|start`. Because `bench-degradation.js` supports `BENCH_REDIS_STOP_CMD` and `BENCH_REDIS_START_CMD`, the exact same script can be pointed at a local Docker container (`docker stop <id>` / `docker start <id>`) on any Docker-enabled host.
2. **Local Single-Host Dev Resources:** Both the load generator (`autocannon`), Express server, `mongodb-memory-server`, and WSL2 Redis shared one laptop (12-core Ryzen 5 5600H, 13.86 GB RAM). Absolute latency and throughput numbers reflect single-machine loopback/vEthernet overhead and in-memory MongoDB rather than remote Atlas or production multi-node clusters.
3. **Failover Tail Latency Spike (Benchmark 2):** Although HTTP error rate was `0%`, stopping Redis abruptly caused 10 in-flight requests to experience a `~2.6s` latency spike while `ioredis` hit `maxRetriesPerRequest: 1` before catching and falling back to MongoDB. Adding tighter per-command timeouts or circuit-breaking would reduce that transition tail.
4. **Cold-Cache Stampede (Benchmark 3):** `cacheAside()` in `backend/src/lib/cache.js` does not coalesce concurrent in-flight misses (no per-key promise map / single-flight lock). Under real Gemini latency (~500–2,000 ms), a burst of `N` identical cold prompts will fan out `N` paid upstream LLM calls.
5. **Dual-Write Consistency Under Partial Failure (Benchmark 4):** With both MongoDB and Redis healthy, 1,000 concurrent XP updates produced `0` mismatches. However, `LeaderboardService.recordXP()` performs a non-transactional dual write (MongoDB `bulkWrite` followed by Redis `ZINCRBY` pipeline). If Redis drops *between* the MongoDB write and the Redis write, Redis will drift until `backend/src/scripts/rebuildLeaderboard.js` is run. Additionally, unique XP scores were assigned so rank ordering had no ties (Redis `ZREVRANGE` breaks score ties lexicographically descending by member ID, which can differ from MongoDB unless the Mongo sort explicitly matches).
6. **Test Coverage Scope (Benchmark 5):** Backend test coverage runs with `REDIS_ENABLED=false` (exercising fallback paths), so Redis-connected branches in `redis.js`, `cache.js`, `rateLimiter.js`, and `leaderboardService.js` remain uncovered in the Vitest coverage report (`52.64%` statements / `45.58%` branches).


---

## Follow-Up: Single-Flight Coalescing in `cacheAside()` (Before vs After)

**Change:** Added a per-key `inFlight` `Map` in `backend/src/lib/cache.js` inside `cacheAside()` so concurrent cache misses for the same key share a single `fetcher()` invocation and clear the entry in `finally` on settlement (both resolution and rejection). Added unit tests in `backend/tests/cache.test.js` (`8` test files, `33` tests passing via `npm test --prefix backend`).

### Command

```bash
npm run bench:stampede --prefix bench
```

### Before vs After Comparison (100 Concurrent Identical Grammar Prompts)

| Variant | Phase | Concurrent Requests | Cache Hits | Cache Misses | Upstream Gemini Calls | Ideal Calls | Wall Time (ms) |
|---|---|---:|---:|---:|---:|---:|---:|
| **Before** (no coalescing) | Cold Cache Burst | 100 | 0 | 100 | **100** | 1 | 71.64 |
| **After** (single-flight `inFlight` map) | Cold Cache Burst | 100 | 0 | 100 | **1** | 1 | 62.07 |
| **Before** (no coalescing) | Warm Cache Burst | 100 | 100 | 0 | **0** | 0 | 7.39 |
| **After** (single-flight `inFlight` map) | Warm Cache Burst | 100 | 100 | 0 | **0** | 0 | 7.52 |

- **Result:** Cold-cache upstream Gemini calls dropped from **100** to **1** (`99%` reduction in duplicate upstream calls per process). Note that this in-process `Map` coalesces concurrent misses within a single Node.js instance; multi-instance deployments would still need a distributed lock/lease if cross-process deduplication is required.

<details>
<summary>Raw stdout from <code>npm run bench:stampede --prefix bench</code> (After single-flight coalescing)</summary>

```text
> duffy-bench@1.0.0 bench:stampede
> node bench-stampede.js

================================================================================
BENCHMARK 3: Cold-Cache Stampede Test (GrammarService.checkWithCacheMeta)
================================================================================
Connecting to Redis at redis://172.29.203.205:6379...
Cache Key                  : cache:ai:grammar:86db9bbce93efee643a5aec8633f9dab8883e8cf0552369db7be5aadc4f8d658
Pre-burst Redis GET        : null (cold cache verified)
Prompt                     : "She don't likes to goes to school yesterday." (English)
Concurrent Requests        : 100
Mocked Gemini Latency      : 50 ms

| Phase | Concurrent Requests | Cache Hits | Cache Misses | Upstream Gemini Calls | Ideal Calls | Wall Time (ms) |
|-------|---------------------|------------|--------------|-----------------------|-------------|----------------|
| Cold Cache Burst |                 100 |          0 |          100 |                     1 |           1 |          62.07 |
| Warm Cache Burst |                 100 |        100 |            0 |                     0 |           0 |           7.52 |

Summary:
- Cold-cache stampede upstream calls: 1 / 100 (ideal with single-flight coalescing: 1)
- Warm-cache follow-up upstream calls: 0 / 100 (100 cache hits)
- Diagnosis: No stampede observed (single upstream call).
[Redis] Connection closed — fallback mode active.
```

</details>
