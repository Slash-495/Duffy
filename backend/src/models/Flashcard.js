import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deck",
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
    },
    word: {
      type: String,
      required: true,
      trim: true,
    },
    meaning: {
      type: String,
      required: true,
      trim: true,
    },
    translation: {
      type: String,
      trim: true,
      default: "",
    },
    exampleSentence: {
      type: String,
      trim: true,
      default: "",
    },
    pronunciation: {
      type: String,
      trim: true,
      default: "",
    },
    ipa: {
      type: String,
      trim: true,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    partOfSpeech: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "chat", "import", "ai"],
      default: "manual",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },

    // Spaced Repetition (SM-2 inspired) Fields
    reviewCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5, // Initial ease factor in SM-2
    },
    interval: {
      type: Number,
      default: 0, // Interval in days
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReviewed: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for querying due cards efficiently
flashcardSchema.index({ userId: 1, nextReviewDate: 1 });
flashcardSchema.index({ userId: 1, deckId: 1 });
flashcardSchema.index({ word: 'text', meaning: 'text', exampleSentence: 'text' }); // Text search index

const Flashcard = mongoose.model("Flashcard", flashcardSchema);
export default Flashcard;
