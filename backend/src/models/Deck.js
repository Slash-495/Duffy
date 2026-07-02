import mongoose from "mongoose";

const deckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Deck statistics cache (updated periodically or on-the-fly)
    stats: {
      totalCards: { type: Number, default: 0 },
      masteredCards: { type: Number, default: 0 },
      learningCards: { type: Number, default: 0 },
      dueCards: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Compound index for fast lookup of a user's unarchived decks
deckSchema.index({ userId: 1, isArchived: 1 });

const Deck = mongoose.model("Deck", deckSchema);
export default Deck;
