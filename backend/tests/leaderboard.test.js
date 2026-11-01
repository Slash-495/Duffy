import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/server.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db.js";
import User from "../src/models/User.model.js";
import LearningProfile from "../src/models/LearningProfile.js";
import { LeaderboardService } from "../src/services/leaderboardService.js";

describe("Leaderboard Service (Mongo-Fallback Mode)", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("returns correct descending XP ordering and user rank from Mongo when Redis is disabled", async () => {
    // Create 3 users
    const [alice, bob, charlie] = await Promise.all([
      User.create({
        fullName: "Alice Learner",
        email: "alice@example.com",
        password: "password123",
      }),
      User.create({
        fullName: "Bob Polyglot",
        email: "bob@example.com",
        password: "password123",
      }),
      User.create({
        fullName: "Charlie Speaker",
        email: "charlie@example.com",
        password: "password123",
      }),
    ]);

    // Create LearningProfiles
    await Promise.all([
      LearningProfile.create({ userId: alice._id, xp: 100, currentStreak: 3, currentCEFR: "A2" }),
      LearningProfile.create({ userId: bob._id, xp: 500, currentStreak: 15, currentCEFR: "B2" }),
      LearningProfile.create({ userId: charlie._id, xp: 250, currentStreak: 7, currentCEFR: "B1" }),
    ]);

    // Record XP in Leaderboard
    const fixedNow = new Date("2026-06-15T12:00:00.000Z");
    await LeaderboardService.recordXP(alice._id, 100, fixedNow);
    await LeaderboardService.recordXP(bob._id, 500, fixedNow);
    await LeaderboardService.recordXP(charlie._id, 250, fixedNow);

    // Query leaderboard as Charlie
    const result = await LeaderboardService.getLeaderboard({
      period: "ALL_TIME",
      currentUserId: charlie._id.toString(),
      now: fixedNow,
    });

    expect(result.source).toBe("mongodb");
    expect(result.entries).toHaveLength(3);

    // Verify ordering by XP descending
    expect(result.entries[0].fullName).toBe("Bob Polyglot");
    expect(result.entries[0].xp).toBe(500);
    expect(result.entries[0].rank).toBe(1);

    expect(result.entries[1].fullName).toBe("Charlie Speaker");
    expect(result.entries[1].xp).toBe(250);
    expect(result.entries[1].rank).toBe(2);

    expect(result.entries[2].fullName).toBe("Alice Learner");
    expect(result.entries[2].xp).toBe(100);
    expect(result.entries[2].rank).toBe(3);

    // Verify currentUser rank & XP
    expect(result.currentUser).toBeDefined();
    expect(result.currentUser.rank).toBe(2);
    expect(result.currentUser.xp).toBe(250);
  });

  it("serves the GET /api/leaderboard endpoint with X-Leaderboard-Source: mongo header", async () => {
    const user = await User.create({
      fullName: "Route Tester",
      email: "routetest@example.com",
      password: "password123",
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    await LearningProfile.create({
      userId: user._id,
      xp: 50,
      currentStreak: 1,
      currentCEFR: "A1",
    });

    await LeaderboardService.recordXP(user._id, 50);

    const res = await request(app)
      .get("/api/leaderboard?period=ALL_TIME")
      .set("Cookie", [`jwt=${token}`]);

    expect(res.status).toBe(200);
    expect(res.headers["x-leaderboard-source"]).toBe("mongodb");
    expect(res.body.source).toBe("mongodb");
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
  });
});
