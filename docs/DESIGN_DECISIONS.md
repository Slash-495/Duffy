# Key Architectural & Design Decisions

This document details the architectural rationale, implementation strategies, trade-offs, and alternatives considered for Duffy's core design decisions.

---

## 1. Redis Sorted Sets for the Leaderboard (with MongoDB Durability)

### Problem
Calculating real-time global user rankings and paginated top-$K$ leaderboards in MongoDB requires full collection sorts across `LearningProfile` or `Leaderboard` documents, accompanied by a separate `countDocuments({ xp: { $gt: callerXp } })` scan on every page view to compute the calling learner's relative rank. Under concurrent write and read load, this introduces substantial database CPU overhead, high tail latencies, and unneeded disk I/O.

### Solution
Active leaderboard periods (`DAILY`, `WEEKLY`, `MONTHLY`, `ALL_TIME`) are maintained in Redis Sorted Sets (`ZSET`).
- **Writes**: XP awards execute an atomic `ZINCRBY` ($O(\log N)$) alongside a durable MongoDB `bulkWrite` operation.
- **Reads**: Client requests retrieve the requested slice via a single pipelined Redis operation (`ZREVRANGE` + `ZCARD` + `ZREVRANK` + `ZSCORE`), coupled with an `MGET` multi-fetch for cached user summary cards.
- **Durability & Fault Tolerance**: MongoDB remains the permanent system of record. If Redis is restarted or cold keys are encountered, keys automatically lazy-warm on access. The CLI utility `npm run rebuild:leaderboard` safely rebuilds all active sorted sets via temporary keys and atomic `RENAME` commands without serving downtime. When Redis is unconfigured or unreachable, `LeaderboardService` gracefully falls back to indexed MongoDB cursor pagination.

### Trade-offs & Alternatives Considered
- **Dual-Write Consistency**: XP is written to MongoDB first and Redis second without a two-phase commit or distributed transaction. In the rare event of a process crash between the Mongo write and Redis command, Redis may briefly lag until reconciled by periodic leaderboard rebuilds.
- **Memory Consumption**: Storing user IDs and scores in memory is significantly lighter than querying disk, but requires periodic TTL management for expired daily and weekly leaderboard keys.

---

## 2. Tier-Based Sliding-Window Rate Limiting on Gemini Endpoints

### Problem
Large language model (LLM) endpoints incur per-token financial costs and strict upstream provider quotas (Google Gemini 2.5 Flash free tiers enforce rigid requests-per-minute ceilings). Standard fixed-window or IP-based rate limiters do not account for users sharing NAT gateways (e.g. universities, offices) and fail to allocate capacity proportionally according to subscription entitlements.

### Solution
Middleware [`createTierRateLimiter`](../backend/src/middleware/rateLimiter.js) dynamically resolves the caller's subscription tier (`FREE`: 10 calls / 15 min, `PREMIUM`: 60 calls / 15 min, `PRO`: 300 calls / 15 min) and evaluates an atomic Lua sliding-window log script on a per-user Redis Sorted Set:
```lua
-- Evict entries older than window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
local current = redis.call('ZCARD', key)
if current >= limit then
  -- calculate retryAfter
  return {0, current, retryAfterMs}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return {1, current + 1, 0}
```
Exceeded requests return HTTP `429` with `Retry-After`, `X-RateLimit-Tier`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers. When Redis is unavailable, the middleware falls back to an in-memory sliding-window store with automated pruning.

### Trade-offs & Alternatives Considered
- **Memory Overhead of Sliding Window**: Storing each request timestamp in a Sorted Set consumes slightly more memory than a leaky bucket or token bucket counter, but prevents traffic bursts at window boundaries and guarantees exact rolling-window enforcement.

---

## 3. Cache-Aside for Repeatable Gemini Prompts

### Problem
Language learners frequently submit identical sentences for grammar checking, common synonym lookups, and standard vocabulary translations. Live LLM inference takes 1.5–4.0 seconds per request, consuming quota and introducing perceptual latency for deterministic responses.

### Solution
Deterministic AI functions (`GrammarService`, `VocabularyService`, `TranslationService`, `VoiceAnalysisService`, and `QuizEngine`) employ a SHA-256 cache-aside pattern.
- Inputs are normalized: `(operation, targetLanguage, message.trim().toLowerCase())`.
- Keys are hashed: `cache:ai:<domain>:<sha256>`.
- Cached results are stored in Redis with a 24-hour TTL (`AI_REPEATABLE_CACHE_TTL_SECONDS = 86400`).
- Responses include an `X-Cache: HIT | MISS` HTTP header.
- Conversational multi-turn roleplay and server-sent event (SSE) explanations are intentionally un-cached because conversational context diverges continuously.

### Trade-offs & Alternatives Considered
- **Cache Invalidation**: Because translation, synonym lookup, and grammatical correction of static sentences are functionally immutable, TTL expiration is sufficient. AI model updates (e.g. prompt tuning) can be handled by namespacing the cache version or flushing the specific prefix.

---

## 4. Role-Based Access Control (RBAC) & Ownership Isolation

### Problem
Educational platforms must distinguish between standard learners, educators managing student cohorts, and administrative staff, while preventing horizontal privilege escalation (e.g. User B reading or editing User A's private study decks).

### Solution
- **Authentication**: Signed 7-day JWT stored inside an `HttpOnly`, `SameSite=Strict` cookie (`jwt`), inaccessible to client-side scripts.
- **Authorization**: Segregated into route-guard middleware (`protectRoute`, `authorizeRoles("TEACHER", "ADMIN")`). Teachers can create classrooms with 6-character uppercase join codes (`joinCode`), assign homework, and review rosters.
- **Ownership Verification**: All Deck and Flashcard controllers filter by `{ _id, userId: req.user.id }`. Queries that do not match the owner return 404 Not Found rather than 403 Forbidden to prevent resource enumeration.
- **Classroom Roster Privacy**: Non-owner teachers attempting to inspect another teacher's classroom roster receive HTTP 403 Forbidden.

### Trade-offs & Alternatives Considered
- **Stateless Tokens vs. Database Sessions**: Stateless JWTs avoid database round-trips for session validation, but lack instantaneous centralized revocation upon password compromise (mitigated by setting 7-day expiry and clearing client cookies on logout).

---

## 5. CEFR-Adaptive AI Coaching Persona

### Problem
Generic LLM prompts produce responses that are either overly simplistic for advanced learners or confusingly complex for beginners, failing to provide comprehensible input at the learner's zone of proximal development (i+1).

### Solution
`RoleplayService` queries the learner's `LearningProfile.currentCEFR` level (`A1` through `C2`) and merges level-specific linguistic directives into the system prompt:
- **A1/A2**: Strict limit to high-frequency vocabulary, present/simple past tenses, short sentences, and explicit encouragement.
- **B1/B2**: Introduction of connecting phrases, idiomatic expressions, and professional/situational contexts.
- **C1/C2**: Nuanced phrasing, colloquial idioms, cultural subtleties, and register switching.
- **Resilience**: Gemini adapter wraps all LLM calls in an `AbortController` timeout (12s) with jittered exponential-backoff retries for transient 429/5xx errors before serving a graceful fallback message.

### Trade-offs & Alternatives Considered
- **Dynamic Prompt Length**: Injecting CEFR guidance increases prompt tokens slightly (~60 tokens per request), but significantly increases response relevance and pedagogic effectiveness.
