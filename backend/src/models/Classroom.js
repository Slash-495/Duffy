import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g. "Spanish 101 - Fall 2026"
    },
    joinCode: {
      type: String,
      required: true,
      unique: true, // Random 6 digit string
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    announcements: [
      {
        content: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const Classroom = mongoose.model("Classroom", classroomSchema);
export default Classroom;
