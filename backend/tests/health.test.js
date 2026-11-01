import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { connectTestDB, disconnectTestDB } from "./helpers/db.js";

describe("Health Check Endpoint", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("GET /health returns 200 and a sensible payload with Redis disabled", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);

    // MongoDB should be healthy in test environment
    expect(res.body.services).toBeDefined();
    expect(res.body.services.mongodb).toBeDefined();
    expect(res.body.services.mongodb.status).toBe("up");
    expect(res.body.services.mongodb.state).toBe("connected");

    // Redis should report disabled
    expect(res.body.services.redis).toBeDefined();
    expect(res.body.services.redis.status).toBe("disabled");
  });

  it("GET /api/health also returns 200 and health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("sets Content-Security-Policy-Report-Only header via Helmet", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["content-security-policy-report-only"]).toBeDefined();
    expect(res.headers["content-security-policy-report-only"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy-report-only"]).toContain("https://*.stream-io-api.com");
  });
});
