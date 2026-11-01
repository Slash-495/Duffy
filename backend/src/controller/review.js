import mongoose from "mongoose";
import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";
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

// @desc    Submit a review grade for a flashcard (atomic SM-2 review)
// @route   POST /api/review/:id
export const submitReview = asyncHandler(async (req, res) => {
  const { quality } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;

  const card = await Flashcard.findOne({ _id: cardId, userId }).lean();

  if (!card) {
    return res.status(404).json({ success: false, message: "Flashcard not found" });
  }

  const now = new Date();
  const wasDue = !card.nextReviewDate || new Date(card.nextReviewDate) <= now;

  const currentRepetitions =
    typeof card.repetitions === "number"
      ? card.repetitions
      : (card.reviewCount || 0);

  const srs = calculateNextReview(
    quality,
    card.easeFactor,
    card.interval,
    currentRepetitions,
    now
  );

  // Optimistic locking / atomic write using previously-read nextReviewDate
  const filter = {
    _id: card._id,
    userId,
    nextReviewDate: card.nextReviewDate,
  };

  const update = {
    $set: {
      easeFactor: srs.easeFactor,
      interval: srs.interval,
      repetitions: srs.repetitions,
      nextReviewDate: srs.nextReviewDate,
      lastReviewed: now,
    },
    $inc: {
      reviewCount: 1,
      ...(quality < 3 ? { wrongCount: 1 } : { correctCount: 1 }),
    },
  };

  const updatedCard = await Flashcard.findOneAndUpdate(filter, update, {
    new: true,
    runValidators: true,
  });

  if (!updatedCard) {
    return res.status(409).json({
      success: false,
      message: "Conflict: Flashcard was already reviewed or modified concurrently",
    });
  }

  // Update Deck stats consistently
  if (wasDue) {
    await Deck.updateOne(
      { _id: updatedCard.deckId, "stats.dueCards": { $gt: 0 } },
      { $inc: { "stats.dueCards": -1 } }
    ).catch(() => {});
  }

  const wasMastered = currentRepetitions >= 5;
  const isNowMastered = srs.repetitions >= 5;
  if (!wasMastered && isNowMastered) {
    await Deck.updateOne(
      { _id: updatedCard.deckId },
      { $inc: { "stats.masteredCards": 1 } }
    ).catch(() => {});
  } else if (wasMastered && !isNowMastered) {
    await Deck.updateOne(
      { _id: updatedCard.deckId, "stats.masteredCards": { $gt: 0 } },
      { $inc: { "stats.masteredCards": -1 } }
    ).catch(() => {});
  }

  await cacheDel(decksCacheKey(userId));

  res.status(200).json(updatedCard);
});
