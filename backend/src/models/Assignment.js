import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["FLASHCARD_REVIEW", "AI_CONVERSATION", "GRAMMAR_QUIZ"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // Could be a Deck ID or Quiz ID
    },
    dueDate: { type: Date, required: true },
    submissions: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["PENDING", "COMPLETED", "LATE"],
          default: "PENDING"
        },
        score: { type: Number }, // Out of 100
        completedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
