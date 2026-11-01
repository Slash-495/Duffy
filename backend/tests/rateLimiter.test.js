import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { createTierRateLimiter } from "../src/middleware/rateLimiter.js";
import { connectTestDB, disconnectTestDB } from "./helpers/db.js";

describe("Tier Rate Limiter (In-Memory Fallback)", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("allows requests up to the FREE budget and blocks the next request with 429 and rate limit headers", async () => {
    const app = express();
    // Unique namespace so state is isolated
    const namespace = `test-tier-${Date.now()}`;
    const limiter = createTierRateLimiter({
      namespace,
      windowMs: 60 * 1000,
    });

    const testUser = {
      _id: "507f1f77bcf86cd799439011",
      role: "USER",
    };

    app.use((req, res, next) => {
      req.user = testUser;
      next();
    });

    app.get("/rate-limited-endpoint", limiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    // Default FREE limit is 10 calls
    for (let i = 1; i <= 10; i++) {
      const res = await request(app).get("/rate-limited-endpoint");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.headers["x-ratelimit-tier"]).toBe("FREE");
      expect(res.headers["x-ratelimit-limit"]).toBe("10");
      expect(res.headers["x-ratelimit-remaining"]).toBe(String(10 - i));
    }

    // 11th request must exceed the budget
    const exceededRes = await request(app).get("/rate-limited-endpoint");

    expect(exceededRes.status).toBe(429);
    expect(exceededRes.body.success).toBe(false);
    expect(exceededRes.body.tier).toBe("FREE");
    expect(exceededRes.body.limit).toBe(10);
    expect(exceededRes.body.retryAfterSeconds).toBeGreaterThan(0);

    // Verify standard rate limit headers
    expect(exceededRes.headers["retry-after"]).toBeDefined();
    expect(Number(exceededRes.headers["retry-after"])).toBeGreaterThan(0);
    expect(exceededRes.headers["x-ratelimit-tier"]).toBe("FREE");
    expect(exceededRes.headers["x-ratelimit-limit"]).toBe("10");
    expect(exceededRes.headers["x-ratelimit-remaining"]).toBe("0");
    expect(exceededRes.headers["x-ratelimit-reset"]).toBeDefined();
  });
});
