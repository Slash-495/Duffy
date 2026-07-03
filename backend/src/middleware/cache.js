/**
 * Cache Middleware Scaffold
 * In a production environment with millions of users, this would wrap a Redis client (e.g. `redis` or `ioredis`).
 * For local development/scaffolding, we use a simple in-memory Map.
 */

const memoryCache = new Map();

export const cacheMiddleware = (durationSeconds) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedBody = memoryCache.get(key);

    if (cachedBody) {
      const parsed = JSON.parse(cachedBody);
      // Check expiry
      if (Date.now() < parsed.expiry) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(parsed.data);
      } else {
        memoryCache.delete(key);
      }
    }

    res.setHeader('X-Cache', 'MISS');
    
    // Intercept res.json to cache the response
    const originalJson = res.json;
    res.json = (body) => {
      const cacheData = {
        data: body,
        expiry: Date.now() + (durationSeconds * 1000)
      };
      memoryCache.set(key, JSON.stringify(cacheData));
      return originalJson.call(res, body);
    };

    next();
  };
};
