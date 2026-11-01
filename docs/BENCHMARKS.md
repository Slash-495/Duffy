# Performance Benchmarks (`autocannon`)

Real load-test measurements comparing Duffy's API performance with **Redis OFF** (graceful MongoDB / live upstream Gemini fallback) versus **Redis ON** (Sorted Sets + `MGET` user hydration, SHA-256 prompt cache-aside, and Lua sliding-window rate limiting).

---

## 1. Test Environment & Methodology

| Parameter | Value |
|---|---|
| **Load Generator** | [`autocannon`](https://github.com/mcollina/autocannon) via [`benchmarks/runBenchmarks.js`](../benchmarks/runBenchmarks.js) |
| **Runtime** | Node.js `v20.13.1` on Windows 11 (`x64`, AMD Ryzen 5 5600H, 12 logical cores) |
| **MongoDB** | Remote MongoDB Atlas cluster over TLS (isolated database `duffy_bench_tmp`, synced compound indexes, **1,000 seeded users**, 1,000 `LearningProfile` docs, 2,000 `Leaderboard` docs) |
| **Redis** | Local `redis-server` `v8.2.10` (`127.0.0.1`, logical DB `/15`) via `ioredis` |
| **AI Model** | Live Google Gemini `gemini-2.5-flash` over HTTPS |
| **Authentication** | Real JWT cookie (`protectRoute` executes on every request, including remote MongoDB `User.findById` lookup) |
| **Error Rate** | `0` non-2xx responses, `0` socket errors, `0` timeouts across all runs |

### Notes on Methodology
1. **Leaderboard Baseline Dominated by Remote Atlas RTT:** Every request in the benchmark was executed from a local development machine against a remote MongoDB Atlas cluster over TLS. In the MongoDB fallback mode, computing the leaderboard requires 5–6 sequential database queries (`find().sort().limit()`, total count, caller search, rank count, and multi-document hydration), each incurring a remote WAN round-trip (~95–105 ms each). In Redis mode, Redis is queried locally on loopback while Atlas is queried once for auth. Consequently, the leaderboard improvement reflects avoiding multiple sequential remote Atlas WAN hops from a local machine as well as memory-index efficiency.
2. **AI Grammar: Cache Hit vs. Cache Miss (Live Gemini Call):** The grammar benchmark does not compare two implementations of the same task; rather, it measures a **cache hit vs. cache miss (live Gemini call)**. Because Google's `gemini-2.5-flash` Free Tier enforces strict rate limits, the uncached baseline (`Redis OFF`) ran 5 serial requests against live Gemini (`p50: 3,707 ms`), whereas the cached mode (`Redis ON`) served repeated requests directly from Redis (`p50: 103 ms`). The throughput gain is a direct consequence of bypassing upstream LLM network calls on repeated inputs, not a like-for-like computation speedup.

---

## 2. Before vs. After Results

### Summary Table

| Endpoint | Mode | Concurrency / Window | p50 Latency | p95 Latency | p99 Latency | Throughput (`req/s`) | Completed (`2xx / Errors`) |
|---|---|---:|---:|---:|---:|---:|---:|
| `GET /api/leaderboard?period=alltime&limit=20` | **Redis OFF** (MongoDB fallback) | `c=10`, `8s` | `700.21 ms` | `2,230.69 ms` | `2,980.63 ms` | `10.88 req/s` | `87 / 0` |
| `GET /api/leaderboard?period=alltime&limit=20` | **Redis ON** (`ZREVRANGE` + `ZREVRANK` + `MGET`) | `c=10`, `8s` | **`106.14 ms`** | **`150.88 ms`** | **`533.94 ms`** | **`85.50 req/s`** | `684 / 0` |
| `POST /api/ai/grammar` | **Redis OFF** (Live `gemini-2.5-flash`) | `c=1`, `n=5` | `3,707.17 ms` | `4,011.41 ms` | `4,011.41 ms` | `0.27 req/s` | `5 / 0` |
| `POST /api/ai/grammar` | **Redis ON** (Cache-Aside `HIT` + Lua Limiter) | `c=10`, `8s` | **`103.88 ms`** | **`326.77 ms`** | **`599.17 ms`** | **`64.00 req/s`** | `512 / 0` |

### Measured Impact

- **Global Leaderboard (`GET /api/leaderboard`):**
  - **p50 latency:** `700.21 ms` -> `106.14 ms` (**6.6x faster**, `-84.8%`)
  - **p95 tail latency:** `2,230.69 ms` -> `150.88 ms` (**14.8x faster**, `-93.2%`)
  - **Throughput:** `10.88 req/s` -> `85.50 req/s` (**7.9x higher req/s**)
  - *Why:* Replaces 5–6 remote MongoDB round-trips per request (`find().sort().limit()`, total `countDocuments`, caller `findOne`, caller rank `countDocuments({ xp: { $gt: callerXp } })`, and `User` + `LearningProfile` hydration) with a single pipelined Redis RTT (`ZREVRANGE` + `ZCARD` + `ZREVRANK` + `ZSCORE` in $O(\log N + K)$) plus a single `MGET` for cached user display summaries.

- **AI Grammar Check (`POST /api/ai/grammar` — Cache Hit vs. Cache Miss):**
  - **p50 latency:** `3,707.17 ms` (live Gemini call) -> `103.88 ms` (Redis cache hit)
  - **p95 tail latency:** `4,011.41 ms` -> `326.77 ms`
  - **Throughput:** `0.27 req/s` (live rate-limited API) -> `64.00 req/s` (cached in-memory responses, consuming **0** upstream LLM tokens on hits)
  - *Context:* This measures the latency reduction of serving an identical prompt from a local cache versus making an external network call to Gemini 2.5 Flash. It demonstrates effective quota protection on repeated inputs rather than a direct comparison of algorithmic performance.

---

## 3. Reproducing Locally

1. Start a local Redis instance:
   ```bash
   docker run -d --name duffy-redis -p 6379:6379 redis:7-alpine
   ```
2. Ensure `backend/.env` has `MONGO_URL` and `GEMINI_API_KEY` set (the script uses an isolated `duffy_bench_tmp` database and logical Redis DB `/15`, dropping both cleanly after the run).
3. Run the suite from the repository root:
   ```bash
   npm run benchmark
   ```
