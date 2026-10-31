import mongoose from "mongoose";
import { getRedisHealth } from "../lib/redis.js";

const READY_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

// @desc    Service health check reporting MongoDB and Redis connectivity
// @route   GET /health
export const getHealthStatus = async (req, res) => {
  const readyState = mongoose.connection.readyState;
  let mongoStatus = readyState === 1 ? "up" : "down";
  let mongoLatencyMs = null;

  if (readyState === 1 && mongoose.connection.db) {
    const start = performance.now();
    try {
      await mongoose.connection.db.admin().ping();
      mongoLatencyMs = Number((performance.now() - start).toFixed(2));
    } catch {
      mongoStatus = "down";
    }
  }

  const redisHealth = await getRedisHealth();

  const isMongoHealthy = mongoStatus === "up";
  const isRedisDegraded = redisHealth.status === "down";

  const overallStatus = !isMongoHealthy
    ? "error"
    : isRedisDegraded
    ? "degraded"
    : "ok";

  const httpStatus = isMongoHealthy ? 200 : 503;

  res.status(httpStatus).json({
    status: overallStatus,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        status: mongoStatus,
        state: READY_STATE_LABELS[readyState] || "unknown",
        latencyMs: mongoLatencyMs,
      },
      redis: redisHealth,
    },
  });
};
