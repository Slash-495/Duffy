import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/server.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db.js";
import User from "../src/models/User.model.js";
import Classroom from "../src/models/Classroom.js";

async function createAuthUser(role = "USER", email = `user-${Date.now()}@example.com`) {
  const user = await User.create({
    fullName: `User ${role}`,
    email,
    password: "password123",
    role,
  });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });
  return { user, token, cookie: `jwt=${token}` };
}

describe("RBAC and Classroom Authorization", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("a USER role gets 403 Forbidden when attempting to create a classroom", async () => {
    const { cookie } = await createAuthUser("USER", "learner@example.com");

    const res = await request(app)
      .post("/api/classrooms")
      .set("Cookie", [cookie])
      .send({ name: "Unauthorized Classroom" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  it("a TEACHER role succeeds on POST /api/classrooms", async () => {
    const { cookie, user } = await createAuthUser("TEACHER", "teacher@example.com");

    const res = await request(app)
      .post("/api/classrooms")
      .set("Cookie", [cookie])
      .send({ name: "Spanish 101" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Spanish 101");
    expect(res.body.teacherId).toBe(user._id.toString());
    expect(res.body.joinCode).toBeDefined();
    expect(res.body.joinCode.length).toBeGreaterThanOrEqual(6);
  });

  it("a learner (USER) can join a classroom using the joinCode", async () => {
    const teacher = await createAuthUser("TEACHER", "teacher_join@example.com");
    const learner = await createAuthUser("USER", "learner_join@example.com");

    // Teacher creates classroom
    const createRes = await request(app)
      .post("/api/classrooms")
      .set("Cookie", [teacher.cookie])
      .send({ name: "German Beginners" });
    const { joinCode, _id: classroomId } = createRes.body;

    // Learner joins with joinCode
    const joinRes = await request(app)
      .post("/api/classrooms/join")
      .set("Cookie", [learner.cookie])
      .send({ joinCode });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);

    // Verify learner was added to the classroom's students in DB
    const updatedClassroom = await Classroom.findById(classroomId);
    expect(updatedClassroom.students.map((s) => s.toString())).toContain(
      learner.user._id.toString()
    );
  });

  it("a different teacher cannot read another teacher's classroom roster (403)", async () => {
    const teacherA = await createAuthUser("TEACHER", "teacher_a@example.com");
    const teacherB = await createAuthUser("TEACHER", "teacher_b@example.com");

    // Teacher A creates classroom
    const createRes = await request(app)
      .post("/api/classrooms")
      .set("Cookie", [teacherA.cookie])
      .send({ name: "Teacher A Class" });
    const classroomId = createRes.body._id;

    // Teacher B attempts to view Teacher A's classroom details/roster
    const resB = await request(app)
      .get(`/api/classrooms/${classroomId}`)
      .set("Cookie", [teacherB.cookie]);

    expect(resB.status).toBe(403);
    expect(resB.body.message).toMatch(/do not own this classroom/i);

    // Teacher A can read their own classroom
    const resA = await request(app)
      .get(`/api/classrooms/${classroomId}`)
      .set("Cookie", [teacherA.cookie]);

    expect(resA.status).toBe(200);
    expect(resA.body.classroom._id).toBe(classroomId);
  });
});
