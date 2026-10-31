import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { getRedisClient } from "../lib/redis.js";
import { FeatureFlagService } from "../services/premium/FeatureFlagService.js";

const DEFAULT_AI_WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS) || 15 * 60 * 1000;

/**
 * Atomic sliding-window log Lua script using a Redis Sorted Set.
 * KEYS[1] = rate-limit key
 * ARGV[1] = current timestamp (ms)
 * ARGV[2] = window duration (ms)
 * ARGV[3] = max allowed requests in window
 * ARGV[4] = unique member id for this request
 * Returns: { allowed (1|0), currentCount, retryAfterMs }
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local windowStart = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
local current = redis.call('ZCARD', key)

if current >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = windowMs
  if oldest[2] then
    retryAfterMs = math.max(1000, (tonumber(oldest[2]) + windowMs) - now)
  end
  return {0, current, retryAfterMs}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return {1, current + 1, 0}
`;

// Fallback in-memory sliding-window store used only when Redis is unavailable
const fallbackWindows = new Map();
const MAX_FALLBACK_KEYS = 5000;

function checkFallbackSlidingWindow(key, now, windowMs, limit) {
  if (fallbackWindows.size > MAX_FALLBACK_KEYS) {
    const cutoff = now - windowMs;
    for (const [k, timestamps] of fallbackWindows.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) fallbackWindows.delete(k);
      else fallbackWindows.set(k, active);
    }
  }

  const windowStart = now - windowMs;
  const existing = fallbackWindows.get(key) || [];
  const active = existing.filter((ts) => ts > windowStart);

  if (active.length >= limit) {
    fallbackWindows.set(key, active);
    const oldest = active[0] || now;
    const retryAfterMs = Math.max(1000, oldest + windowMs - now);
    return { allowed: false, count: active.length, retryAfterMs };
  }

  active.push(now);
  fallbackWindows.set(key, active);
  return { allowed: true, count: active.length, retryAfterMs: 0 };
}

/**
 * Per-user, tier-aware sliding-window rate limiter backed by Redis.
 * Enforces Free / Premium / Pro limits on Gemini-backed endpoints and returns 429 + Retry-After.
 */
export const createTierRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || DEFAULT_AI_WINDOW_MS;
  const namespace = options.namespace || "ai";

  return async (req, res, next) => {
    try {
      const user = req.user;
      const identifier = user?._id?.toString() || req.ip || "anonymous";
      const limits = await FeatureFlagService.getUserLimits(user || identifier);
      const tier = limits.tier || "FREE";
      const maxRequests = limits.maxWindowAICalls;

      const key = `ratelimit:${namespace}:${identifier}`;
      const now = Date.now();
      const client = getRedisClient();

      let allowed = true;
      let count = 1;
      let retryAfterMs = 0;

      if (client) {
        try {
          const member = `${now}:${crypto.randomBytes(4).toString("hex")}`;
          const result = await client.eval(
            SLIDING_WINDOW_LUA,
            1,
            key,
            String(now),
            String(windowMs),
            String(maxRequests),
            member
          );
          allowed = Number(result[0]) === 1;
          count = Number(result[1]);
          retryAfterMs = Number(result[2]);
        } catch (redisErr) {
          console.warn(`[RateLimiter] Redis eval failed, using in-memory fallback: ${redisErr.message}`);
          const fb = checkFallbackSlidingWindow(key, now, windowMs, maxRequests);
          allowed = fb.allowed;
          count = fb.count;
          retryAfterMs = fb.retryAfterMs;
        }
      } else {
        const fb = checkFallbackSlidingWindow(key, now, windowMs, maxRequests);
        allowed = fb.allowed;
        count = fb.count;
        retryAfterMs = fb.retryAfterMs;
      }

      const remaining = Math.max(0, maxRequests - count);
      res.setHeader("X-RateLimit-Tier", tier);
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (!allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.setHeader(
          "X-RateLimit-Reset",
          String(Math.ceil((now + retryAfterSeconds * 1000) / 1000))
        );
        return res.status(429).json({
          success: false,
          message: `AI rate limit exceeded for ${tier} tier (${maxRequests} requests per ${Math.round(
            windowMs / 60000
          )}m). Please retry in ${retryAfterSeconds}s.`,
          tier,
          limit: maxRequests,
          retryAfterSeconds,
        });
      }

      return next();
    } catch (err) {
      // Fail open rather than taking down requests if unexpected state occurs
      console.warn(`[RateLimiter] Unexpected error, failing open: ${err.message}`);
      return next();
    }
  };
};

export const aiLimiter = createTierRateLimiter({ namespace: "ai" });

// General IP-based limiter for public / auth endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => Number(process.env.API_RATE_LIMIT_MAX) || 200,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many authentication attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
