import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"],
      required: true,
    },
    periodKey: {
      type: String,
      required: true, // e.g. "2026-W27" for weekly, or "2026-07-03" for daily
    },
    xpEarned: {
      type: Number,
      default: 0,
    },
    conversationsCount: {
      type: Number,
      default: 0,
    },
    flashcardsReviewed: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

// Compound index for fast querying of leaderboards
leaderboardSchema.index({ period: 1, periodKey: 1, xpEarned: -1 });

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
export default Leaderboard;
