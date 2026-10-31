import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * Express GET response cache-aside middleware backed by Redis.
 * Scopes keys per authenticated user (unless options.isPublic is true)
 * and falls through transparently when Redis is unavailable.
 */
export const cacheMiddleware = (durationSeconds = 300, options = {}) => {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const scope = options.isPublic ? "public" : req.user?._id?.toString() || "anon";
    const prefix = options.keyPrefix || "http";
    const key = `cache:${prefix}:${scope}:${req.originalUrl || req.url}`;

    const cachedBody = await cacheGet(key);
    if (cachedBody !== null) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cachedBody);
    }

    res.setHeader("X-Cache", "MISS");

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, body, durationSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
};
