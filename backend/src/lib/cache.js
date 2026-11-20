import crypto from "crypto";
import { getRedisClient } from "./redis.js";

/**
 * Deterministically hashes normalized inputs to build compact, collision-safe Redis keys.
 */
export function buildCacheHashKey(namespace, parts) {
  const normalized = JSON.stringify(parts, (_, value) => {
    if (typeof value === "string") {
      return value.trim().replace(/\s+/g, " ");
    }
    return value;
  });
  const digest = crypto.createHash("sha256").update(normalized).digest("hex");
  return `cache:${namespace}:${digest}`;
}

export async function cacheGet(key) {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache] GET failed for ${key}: ${err.message}`);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedisClient();
  if (!client || value === undefined) return false;

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`[Cache] SET failed for ${key}: ${err.message}`);
    return false;
  }
}

export async function cacheDel(...keys) {
  const client = getRedisClient();
  const validKeys = keys.flat().filter(Boolean);
  if (!client || validKeys.length === 0) return 0;

  try {
    return await client.del(...validKeys);
  } catch (err) {
    console.warn(`[Cache] DEL failed for ${validKeys.join(", ")}: ${err.message}`);
    return 0;
  }
}

const inFlight = new Map();

/**
 * Cache-aside helper returning { data, hit } so controllers can attach X-Cache headers.
 * Coalesces concurrent misses for the same key into a single in-flight fetcher() call.
 */
export async function cacheAside(key, ttlSeconds, fetcher) {
  let pending = inFlight.get(key);
  if (pending) {
    const data = await pending;
    return { data, hit: false };
  }

  const cached = await cacheGet(key);
  if (cached !== null) {
    return { data: cached, hit: true };
  }

  pending = inFlight.get(key);
  if (pending) {
    const data = await pending;
    return { data, hit: false };
  }

  const promise = (async () => {
    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      await cacheSet(key, fresh, ttlSeconds);
    }
    return fresh;
  })();

  inFlight.set(key, promise);

  try {
    const data = await promise;
    return { data, hit: false };
  } finally {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  }
}
