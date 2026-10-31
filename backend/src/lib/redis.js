import Redis from "ioredis";
import dotenv from "dotenv";
import { logger } from "./logger.js";

dotenv.config();

let redisClient = null;
let connectionAttempted = false;
let runtimeEnabled = process.env.REDIS_ENABLED !== "false";
let lastErrorLoggedAt = 0;

const ERROR_LOG_THROTTLE_MS = 30_000;

function logWarnThrottled(message) {
  const now = Date.now();
  if (now - lastErrorLoggedAt >= ERROR_LOG_THROTTLE_MS) {
    lastErrorLoggedAt = now;
    console.warn(message);
  }
}

/**
 * Initializes the shared ioredis client if REDIS_URL is configured.
 * Never throws: if Redis is unreachable or unconfigured, callers fall back cleanly.
 */
export async function connectRedis() {
  if (!runtimeEnabled) {
    if (!connectionAttempted) {
      console.warn("[Redis] Disabled via REDIS_ENABLED=false — using fallback mode.");
      connectionAttempted = true;
    }
    return null;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    if (!connectionAttempted) {
      console.warn("[Redis] REDIS_URL not set — running without Redis (graceful fallback active).");
      connectionAttempted = true;
    }
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  connectionAttempted = true;

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (!runtimeEnabled) return null;
        // Exponential backoff from 500ms up to 15s so background reconnects are quiet
        return Math.min(times * 500, 15_000);
      },
    });

    client.on("ready", () => {
      logger.info("[Redis] Connected and ready.");
    });

    client.on("error", (err) => {
      logWarnThrottled(
        `[Redis] Connection warning (${err?.code || err?.message || "unknown error"}) — fallback mode active.`
      );
    });

    client.on("end", () => {
      logWarnThrottled("[Redis] Connection closed — fallback mode active.");
    });

    redisClient = client;
    await client.connect();
    return client;
  } catch (err) {
    logWarnThrottled(
      `[Redis] Initial connection failed (${err?.message || "unreachable"}) — continuing in fallback mode.`
    );
    return null;
  }
}

/**
 * Returns the active ioredis client only when ready to serve commands immediately.
 */
export function getRedisClient() {
  if (!runtimeEnabled || !redisClient || redisClient.status !== "ready") {
    return null;
  }
  return redisClient;
}

export function isRedisAvailable() {
  return Boolean(getRedisClient());
}

/**
 * Allows benchmarks and tests to toggle Redis usage at runtime without restarting Node.
 */
export function setRedisRuntimeEnabled(enabled) {
  runtimeEnabled = Boolean(enabled);
}

/**
 * Health check probe for /health endpoint.
 */
export async function getRedisHealth() {
  if (!runtimeEnabled || !process.env.REDIS_URL?.trim()) {
    return { status: "disabled", latencyMs: null };
  }

  const client = getRedisClient();
  if (!client) {
    return { status: "down", state: redisClient?.status || "disconnected", latencyMs: null };
  }

  const start = performance.now();
  try {
    const pong = await client.ping();
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return {
      status: pong === "PONG" ? "up" : "degraded",
      latencyMs,
    };
  } catch (err) {
    return {
      status: "down",
      error: err.message,
      latencyMs: null,
    };
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
      connectionAttempted = false;
    }
  }
}

export default {
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  setRedisRuntimeEnabled,
  getRedisHealth,
  disconnectRedis,
};
