import mongoose from "mongoose";

const communityDeckSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalDeckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deck",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    tags: [String],
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner"
    },
    likesCount: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    isTrending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CommunityDeck = mongoose.model("CommunityDeck", communityDeckSchema);
export default CommunityDeck;
