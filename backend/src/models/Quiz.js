import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: {
      type: String,
      required: true, // E.g., "Present Perfect vs Past Simple" or "Travel Vocabulary"
    },
    questions: [
      {
        type: {
          type: String,
          enum: ["mcq", "fill_in_blank", "translation"],
          required: true,
        },
        prompt: String,
        options: [String], // for MCQ
        correctAnswer: String,
        explanation: String,
      }
    ],
    score: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
