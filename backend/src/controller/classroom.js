import crypto from "crypto";
import Classroom from "../models/Classroom.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.model.js";
import LearningProfile from "../models/LearningProfile.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import {
  decodeIdCursor,
  parsePageLimit,
  buildCursorPage,
  encodeIdCursor,
} from "../lib/pagination.js";

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const exists = await Classroom.exists({ joinCode: code });
    if (!exists) return code;
  }
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

// @desc    Create a classroom (TEACHER / ADMIN only)
// @route   POST /api/classrooms
export const createClassroom = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const joinCode = await generateUniqueJoinCode();

  const classroom = await Classroom.create({
    teacherId: req.user._id,
    name,
    joinCode,
    students: [],
  });

  res.status(201).json(classroom);
});

// @desc    List classrooms managed by the teacher (cursor-paginated)
// @route   GET /api/classrooms
export const getClassrooms = asyncHandler(async (req, res) => {
  const limit = parsePageLimit(req.query.limit, 20, 50);
  const cursorId = decodeIdCursor(req.query.cursor);

  const filter =
    req.user.role === "ADMIN" ? {} : { teacherId: req.user._id };
  if (cursorId) {
    filter._id = { $lt: cursorId };
  }

  const docs = await Classroom.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const { items, pagination } = buildCursorPage(docs, limit);

  // Batch fetch next upcoming assignment per classroom (single query, no N+1)
  const classIds = items.map((c) => c._id);
  const upcomingAssignments = classIds.length
    ? await Assignment.find({
        classroomId: { $in: classIds },
        dueDate: { $gte: new Date() },
      })
        .sort({ dueDate: 1 })
        .select("classroomId title dueDate")
        .lean()
    : [];

  const nextByClass = new Map();
  for (const a of upcomingAssignments) {
    const cid = a.classroomId.toString();
    if (!nextByClass.has(cid)) {
      nextByClass.set(cid, a.title);
    }
  }

  const classrooms = items.map((cls) => ({
    _id: cls._id,
    name: cls.name,
    joinCode: cls.joinCode,
    studentCount: cls.students?.length || 0,
    nextAssignment: nextByClass.get(cls._id.toString()) || "None scheduled",
    createdAt: cls.createdAt,
  }));

  res.status(200).json({ classrooms, pagination });
});

// @desc    Join a classroom via 6-char joinCode (any authenticated learner)
// @route   POST /api/classrooms/join
export const joinClassroom = asyncHandler(async (req, res) => {
  const joinCode = req.body.joinCode.toUpperCase();

  const classroom = await Classroom.findOneAndUpdate(
    { joinCode },
    { $addToSet: { students: req.user._id } },
    { new: true }
  ).select("name joinCode teacherId");

  if (!classroom) {
    throw new AppError("Invalid classroom join code", 404);
  }

  res.status(200).json({
    success: true,
    classroom,
  });
});

// @desc    Get classroom details, cursor-paginated student roster + assignments (TEACHER / ADMIN)
// @route   GET /api/classrooms/:id
export const getClassroomById = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id).lean();
  if (!classroom) {
    throw new AppError("Classroom not found", 404);
  }

  if (
    req.user.role !== "ADMIN" &&
    classroom.teacherId.toString() !== req.user._id.toString()
  ) {
    throw new AppError("Forbidden - You do not own this classroom", 403);
  }

  const limit = parsePageLimit(req.query.limit, 25, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

  const studentFilter = { _id: { $in: classroom.students || [] } };
  if (cursorId) {
    studentFilter._id = { $in: classroom.students || [], $lt: cursorId };
  }

  const [studentDocs, assignments] = await Promise.all([
    User.find(studentFilter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select("fullName email profilePic nativeLanguage learningLanguage")
      .lean(),
    Assignment.find({ classroomId: classroom._id })
      .sort({ dueDate: 1 })
      .lean(),
  ]);

  const hasMore = studentDocs.length > limit;
  const pageStudents = hasMore ? studentDocs.slice(0, limit) : studentDocs;
  const nextCursor =
    hasMore && pageStudents.length > 0
      ? encodeIdCursor(pageStudents[pageStudents.length - 1]._id)
      : null;

  // Batch join LearningProfile stats (single $in query, zero N+1)
  const studentIds = pageStudents.map((s) => s._id);
  const profiles = studentIds.length
    ? await LearningProfile.find({ userId: { $in: studentIds } })
        .select("userId xp currentStreak")
        .lean()
    : [];
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const roster = pageStudents.map((s) => {
    const idStr = s._id.toString();
    const prof = profileMap.get(idStr);
    const completedAssignments = assignments.reduce((acc, a) => {
      const done = (a.submissions || []).some(
        (sub) => sub.studentId?.toString() === idStr && sub.status === "COMPLETED"
      );
      return acc + (done ? 1 : 0);
    }, 0);

    return {
      _id: s._id,
      fullName: s.fullName,
      email: s.email,
      profilePic: s.profilePic || "",
      xp: prof?.xp || 0,
      streak: prof?.currentStreak || 0,
      completedAssignments,
      needsHelp: (prof?.currentStreak || 0) === 0 && (prof?.xp || 0) < 100,
    };
  });

  const totalStudents = classroom.students?.length || 0;
  const formattedAssignments = assignments.map((a) => {
    const completedCount = (a.submissions || []).filter(
      (sub) => sub.status === "COMPLETED"
    ).length;
    const completionRate =
      totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
    return {
      _id: a._id,
      title: a.title,
      description: a.description || "",
      type: a.type,
      dueDate: a.dueDate,
      completionRate,
    };
  });

  res.status(200).json({
    classroom: {
      _id: classroom._id,
      name: classroom.name,
      joinCode: classroom.joinCode,
      totalStudents,
    },
    students: roster,
    assignments: formattedAssignments,
    pagination: {
      limit,
      hasMore,
      nextCursor,
    },
  });
});

// @desc    Create a classroom assignment (TEACHER / ADMIN)
// @route   POST /api/classrooms/:id/assignments
export const createAssignment = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id).lean();
  if (!classroom) {
    throw new AppError("Classroom not found", 404);
  }

  if (
    req.user.role !== "ADMIN" &&
    classroom.teacherId.toString() !== req.user._id.toString()
  ) {
    throw new AppError("Forbidden - You do not own this classroom", 403);
  }

  const assignment = await Assignment.create({
    classroomId: classroom._id,
    title: req.body.title,
    description: req.body.description,
    type: req.body.type,
    targetId: req.body.targetId,
    dueDate: req.body.dueDate,
  });

  res.status(201).json(assignment);
});
