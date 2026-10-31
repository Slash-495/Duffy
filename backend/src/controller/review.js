import mongoose from "mongoose";
import Flashcard from "../models/Flashcard.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { calculateNextReview } from "../services/srsService.js";
import { cacheDel } from "../lib/cache.js";
import { decksCacheKey } from "./decks.js";
import { AppError } from "../lib/AppError.js";
import { parsePageLimit } from "../lib/pagination.js";

function encodeDueCursor(card) {
  if (!card?._id || !card?.nextReviewDate) return null;
  return Buffer.from(
    JSON.stringify({
      nextReviewDate: new Date(card.nextReviewDate).toISOString(),
      id: card._id.toString(),
    }),
    "utf8"
  ).toString("base64url");
}

function decodeDueCursor(rawCursor) {
  if (!rawCursor || typeof rawCursor !== "string") return null;
  try {
    const parsed = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8"));
    const date = new Date(parsed?.nextReviewDate);
    if (
      !Number.isNaN(date.getTime()) &&
      parsed?.id &&
      mongoose.Types.ObjectId.isValid(parsed.id)
    ) {
      return {
        nextReviewDate: date,
        id: new mongoose.Types.ObjectId(parsed.id),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// @desc    Get due cards for the user (cursor-paginated, optionally filtered by deck)
// @route   GET /api/review/due
export const getDueCards = asyncHandler(async (req, res) => {
  const { deckId, cursor } = req.query;
  const limit = parsePageLimit(req.query.limit, 50, 100);
  const now = new Date();

  const baseFilter = {
    userId: req.user.id,
    nextReviewDate: { $lte: now },
  };

  if (deckId) {
    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      throw new AppError("Invalid deckId query parameter", 400);
    }
    baseFilter.deckId = deckId;
  }

  const decoded = decodeDueCursor(cursor);
  const query = decoded
    ? {
        $and: [
          baseFilter,
          {
            $or: [
              { nextReviewDate: { $gt: decoded.nextReviewDate } },
              {
                nextReviewDate: decoded.nextReviewDate,
                _id: { $gt: decoded.id },
              },
            ],
          },
        ],
      }
    : baseFilter;

  const docs = await Flashcard.find(query)
    .sort({ nextReviewDate: 1, _id: 1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const dueCards = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor =
    hasMore && dueCards.length > 0
      ? encodeDueCursor(dueCards[dueCards.length - 1])
      : null;

  res.setHeader("X-Has-More", String(hasMore));
  if (nextCursor) {
    res.setHeader("X-Next-Cursor", nextCursor);
  }

  res.status(200).json(dueCards);
});

// @desc    Submit a review grade for a flashcard
// @route   POST /api/review/:id
export const submitReview = asyncHandler(async (req, res) => {
  const { quality } = req.body;

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
