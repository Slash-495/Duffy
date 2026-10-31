import express from "express";
import { protectRoute, authorizeRoles } from "../middleware/auth.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import {
  createClassroomSchema,
  joinClassroomSchema,
  createAssignmentSchema,
} from "../validators/schemas.js";
import {
  createClassroom,
  getClassrooms,
  joinClassroom,
  getClassroomById,
  createAssignment,
} from "../controller/classroom.js";

const router = express.Router();

router.use(protectRoute);

router.post("/join", validateBody(joinClassroomSchema), joinClassroom);

router.post(
  "/",
  authorizeRoles("TEACHER", "ADMIN"),
  validateBody(createClassroomSchema),
  createClassroom
);
router.get("/", authorizeRoles("TEACHER", "ADMIN"), getClassrooms);
router.get(
  "/:id",
  authorizeRoles("TEACHER", "ADMIN"),
  validateObjectIdParam("id"),
  getClassroomById
);
router.post(
  "/:id/assignments",
  authorizeRoles("TEACHER", "ADMIN"),
  validateObjectIdParam("id"),
  validateBody(createAssignmentSchema),
  createAssignment
);

export default router;
