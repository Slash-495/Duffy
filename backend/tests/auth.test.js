import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db.js";
import User from "../src/models/User.model.js";

describe("Auth Endpoints", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe("POST /api/auth/signup", () => {
    it("returns 400 when validation fails (invalid email or short password)", async () => {
      // Invalid email
      const resInvalidEmail = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "John Doe",
          email: "not-an-email",
          password: "password123",
        });
      expect(resInvalidEmail.status).toBe(400);
      expect(resInvalidEmail.body.success).toBe(false);

      // Short password (< 6 chars)
      const resShortPass = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "John Doe",
          email: "john@example.com",
          password: "123",
        });
      expect(resShortPass.status).toBe(400);
      expect(resShortPass.body.success).toBe(false);

      // Missing fullName
      const resMissingName = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "john@example.com",
          password: "password123",
        });
      expect(resMissingName.status).toBe(400);
    });

    it("returns 400 on duplicate email registration", async () => {
      // First signup succeeds
      const firstRes = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Original User",
          email: "duplicate@example.com",
          password: "password123",
        });
      expect(firstRes.status).toBe(201);

      // Second signup with same email fails
      const secondRes = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Another User",
          email: "duplicate@example.com",
          password: "differentpassword",
        });
      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toMatch(/already exists/i);
    });

    it("normalizes email to lowercase on signup preventing duplicate accounts with different casing", async () => {
      const resUpper = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Case Sensitive User",
          email: "CaseUser@Example.COM",
          password: "password123",
        });

      expect(resUpper.status).toBe(201);
      expect(resUpper.body.user.email).toBe("caseuser@example.com");

      // Attempting signup with lowercase equivalent returns 400
      const resLower = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Case User Clone",
          email: "caseuser@example.com",
          password: "password456",
        });

      expect(resLower.status).toBe(400);
      expect(resLower.body.message).toMatch(/already exists/i);
    });

    it("successfully creates a user and sets an HttpOnly jwt cookie", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Valid User",
          email: "valid@example.com",
          password: "securepassword123",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("valid@example.com");
      expect(res.body.user.password).toBeUndefined();

      // Check cookie headers
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const jwtCookie = cookies.find((c) => c.startsWith("jwt="));
      expect(jwtCookie).toBeDefined();
      expect(jwtCookie).toMatch(/HttpOnly/i);
      expect(jwtCookie).toMatch(/SameSite=Strict/i);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Seed user for login
      await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Login Test User",
          email: "logintest@example.com",
          password: "mypassword123",
        });
    });

    it("succeeds with correct credentials and returns jwt cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "logintest@example.com",
          password: "mypassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe("logintest@example.com");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const jwtCookie = cookies.find((c) => c.startsWith("jwt="));
      expect(jwtCookie).toBeDefined();
      expect(jwtCookie).toMatch(/HttpOnly/i);
    });

    it("allows login with case-insensitive email input", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "LOGINTEST@EXAMPLE.COM",
          password: "mypassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe("logintest@example.com");
    });

    it("fails with 401 when password is incorrect", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "logintest@example.com",
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it("fails with 401 when email does not exist", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "mypassword123",
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without auth cookie", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 and user data with valid auth cookie", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Me Query User",
          email: "mequery@example.com",
          password: "password123",
        });

      const cookies = signupRes.headers["set-cookie"];
      const jwtCookie = cookies.find((c) => c.startsWith("jwt="));

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [jwtCookie]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.user.email).toBe("mequery@example.com");
      expect(meRes.body.user.fullName).toBe("Me Query User");
    });
  });
});
