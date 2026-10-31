import mongoose from "mongoose";

const activityFeedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["ACHIEVEMENT", "STREAK", "DECK_PUBLISHED", "LEVEL_UP", "CONVERSATION_MILESTONE"],
      required: true,
    },
    content: {
      type: String,
      required: true, // E.g., "John reached a 7-day streak!"
    },
    metadata: {
      // Flexible object for specific event data
      badgeId: String,
      streakDays: Number,
      deckId: mongoose.Schema.Types.ObjectId,
    },
    visibility: {
      type: String,
      enum: ["PUBLIC", "FRIENDS_ONLY", "PRIVATE"],
      default: "FRIENDS_ONLY"
    }
  },
  { timestamps: true }
);

// Compound indexes for cursor-paginated friend & community feeds
activityFeedSchema.index({ userId: 1, visibility: 1, _id: -1 });
activityFeedSchema.index({ visibility: 1, _id: -1 });

const ActivityFeed = mongoose.model("ActivityFeed", activityFeedSchema);
export default ActivityFeed;
