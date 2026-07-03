import mongoose from "mongoose";

const learningProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    dailyGoalXP: {
      type: Number,
      default: 50, // Default 50 XP per day
    },
    targetCEFR: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      default: "B2",
    },
    currentCEFR: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      default: "A1",
    },
    weakTopics: {
      grammar: [String],
      vocabulary: [String],
    },
    achievements: [
      {
        badgeId: String,
        unlockedAt: Date,
      }
    ],
    dailyMissions: [
      {
        type: { type: String }, // e.g. "flashcards", "quiz", "chat"
        target: Number,
        progress: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        dateAssigned: Date,
      }
    ],
  },
  { timestamps: true }
);

const LearningProfile = mongoose.model("LearningProfile", learningProfileSchema);
export default LearningProfile;
