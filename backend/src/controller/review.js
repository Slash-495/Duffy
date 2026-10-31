import Flashcard from "../models/Flashcard.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { calculateNextReview } from "../services/srsService.js";
import { cacheDel } from "../lib/cache.js";
import { decksCacheKey } from "./decks.js";

// @desc    Get all due cards for the user (or optionally filtered by deck)
// @route   GET /api/review/due
export const getDueCards = asyncHandler(async (req, res) => {
  const { deckId, limit = 50 } = req.query;
  const now = new Date();

  const query = {
    userId: req.user.id,
    nextReviewDate: { $lte: now },
  };

  if (deckId) {
    query.deckId = deckId;
  }

  const dueCards = await Flashcard.find(query)
    .sort({ nextReviewDate: 1 })
    .limit(Number(limit));

  res.status(200).json(dueCards);
});

// @desc    Submit a review grade for a flashcard
// @route   POST /api/review/:id
export const submitReview = asyncHandler(async (req, res) => {
  const { quality } = req.body;

  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ message: "Valid review quality (0-5) is required" });
  }

  const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user.id });

  if (!card) {
    return res.status(404).json({ message: "Flashcard not found" });
  }

  const { easeFactor, interval, nextReviewDate } = calculateNextReview(
    quality,
    card.easeFactor,
    card.interval,
    card.reviewCount
  );

  card.easeFactor = easeFactor;
  card.interval = interval;
  card.nextReviewDate = nextReviewDate;
  card.lastReviewed = new Date();
  card.reviewCount += 1;

  if (quality < 3) {
    card.wrongCount += 1;
  } else {
    card.correctCount += 1;
  }

  await card.save();
  await cacheDel(decksCacheKey(req.user.id));

  res.status(200).json(card);
});
