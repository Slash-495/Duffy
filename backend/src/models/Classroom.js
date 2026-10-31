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

// Indexes for teacher dashboard and student roster lookups
classroomSchema.index({ teacherId: 1, _id: -1 });
classroomSchema.index({ students: 1 });

const Classroom = mongoose.model("Classroom", classroomSchema);
export default Classroom;
