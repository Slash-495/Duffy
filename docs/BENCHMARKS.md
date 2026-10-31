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
1. **End-to-End Authenticated Stack:** Every request passes through `helmet`, `cors`, `cookieParser`, `protectRoute` (JWT verification + remote MongoDB Atlas `User.findById`), and route controllers. Consequently, even pure Redis hits include ~95–105 ms of remote MongoDB Atlas network RTT from `protectRoute`. On Render (where app, MongoDB Atlas region, and Redis are co-located in the same cloud region), that auth RTT drops to ~2–5 ms.
2. **Gemini Quota Constraint (Redis OFF):** Google's `gemini-2.5-flash` Free Tier enforces a strict **5 requests/minute** project quota. For the uncached `POST /api/ai/grammar` baseline (`Redis OFF`), `autocannon` ran `connections: 1, amount: 5` against live Gemini so all 5 requests completed with `200 OK` rather than benchmarking upstream `429` errors. For `Redis ON`, `autocannon` ran sustained concurrency (`connections: 10, duration: 8s`), serving **512 requests** with **zero** repeat Gemini API calls after the initial cache-warming request.

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

- **AI Grammar Check (`POST /api/ai/grammar`):**
  - **p50 latency:** `3,707.17 ms` -> `103.88 ms` (**35.7x faster**, `-97.2%`)
  - **p95 tail latency:** `4,011.41 ms` -> `326.77 ms` (**12.3x faster**, `-91.9%`)
  - **Throughput:** `0.27 req/s` -> `64.00 req/s` (**237x higher req/s** on repeated inputs, while consuming **0** upstream LLM tokens on cache hits)
  - *Why:* Grammar, vocabulary, translation, and transcript pronunciation prompts are deterministic functions of `(normalizedInput, targetLanguage)`. Keying `cache:ai:grammar:<sha256>` with a 24-hour TTL eliminates multi-second LLM inference and protects against upstream Gemini rate-limit exhaustion on repeated phrases and common learner mistakes.

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
