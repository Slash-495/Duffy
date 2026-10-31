/**
 * Re-export of the Redis client module from backend/src/lib/redis.js
 * so imports from either backend/lib/redis.js or backend/src/lib/redis.js resolve cleanly.
 */
export {
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  setRedisRuntimeEnabled,
  getRedisHealth,
  disconnectRedis,
  default,
} from "../src/lib/redis.js";
