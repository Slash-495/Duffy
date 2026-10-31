import Deck from "../models/Deck.js";
import Flashcard from "../models/Flashcard.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { cacheAside, cacheDel } from "../lib/cache.js";
import { ActivityService } from "../services/activityService.js";
import {
  decodeIdCursor,
  parsePageLimit,
  buildCursorPage,
} from "../lib/pagination.js";

const DECKS_CACHE_TTL_SECONDS = 300; // 5 minutes

export function decksCacheKey(userId) {
  return `cache:decks:${userId.toString()}`;
}

// @desc    Create a new deck
// @route   POST /api/decks
export const createDeck = asyncHandler(async (req, res) => {
  const { name, description, tags } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Deck name is required" });
  }

  const deck = await Deck.create({
    userId: req.user.id,
    name,
    description,
    tags,
  });

  await cacheDel(decksCacheKey(req.user.id));

  ActivityService.recordActivity({
    userId: req.user._id,
    type: "DECK_PUBLISHED",
    content: `created a new study deck "${deck.name}".`,
    metadata: { deckId: deck._id },
    visibility: "PUBLIC",
  }).catch(() => {});

  res.status(201).json(deck);
});

// @desc    Get decks for a user (Redis cache-aside on first page, cursor-paginated)
// @route   GET /api/decks
export const getDecks = asyncHandler(async (req, res) => {
  const limit = parsePageLimit(req.query.limit, 50, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

  if (!cursorId && limit === 50) {
    const { data: cachedPage, hit } = await cacheAside(
      decksCacheKey(req.user.id),
      DECKS_CACHE_TTL_SECONDS,
      async () => {
        const docs = await Deck.find({ userId: req.user.id, isArchived: false })
          .sort({ _id: -1 })
          .limit(limit + 1)
          .lean();
        return buildCursorPage(docs, limit);
      }
    );

    res.setHeader("X-Cache", hit ? "HIT" : "MISS");
    res.setHeader("X-Has-More", String(cachedPage.pagination.hasMore));
    if (cachedPage.pagination.nextCursor) {
      res.setHeader("X-Next-Cursor", cachedPage.pagination.nextCursor);
    }
    return res.status(200).json(cachedPage.items);
  }

  const filter = { userId: req.user.id, isArchived: false };
  if (cursorId) {
    filter._id = { $lt: cursorId };
  }

  const docs = await Deck.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const { items, pagination } = buildCursorPage(docs, limit);
  res.setHeader("X-Cache", "MISS");
  res.setHeader("X-Has-More", String(pagination.hasMore));
  if (pagination.nextCursor) {
    res.setHeader("X-Next-Cursor", pagination.nextCursor);
  }
  res.status(200).json(items);
});

// @desc    Get a single deck with cursor-paginated cards
// @route   GET /api/decks/:id
export const getDeckById = asyncHandler(async (req, res) => {
  const deck = await Deck.findOne({ _id: req.params.id, userId: req.user.id }).lean();

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const limit = parsePageLimit(req.query.limit, 50, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

  const cardFilter = { deckId: deck._id };
  if (cursorId) {
    cardFilter._id = { $lt: cursorId };
  }

  const cardDocs = await Flashcard.find(cardFilter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const { items: cards, pagination } = buildCursorPage(cardDocs, limit);

  res.status(200).json({ deck, cards, pagination });
});

// @desc    Update a deck
// @route   PUT /api/decks/:id
export const updateDeck = asyncHandler(async (req, res) => {
  const { name, description, tags, isArchived } = req.body;

  const deck = await Deck.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { name, description, tags, isArchived },
    { new: true, runValidators: true }
  );

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  await cacheDel(decksCacheKey(req.user.id));

  res.status(200).json(deck);
});

// @desc    Delete a deck and all its cards
// @route   DELETE /api/decks/:id
export const deleteDeck = asyncHandler(async (req, res) => {
  const deck = await Deck.findOne({ _id: req.params.id, userId: req.user.id });

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  await Flashcard.deleteMany({ deckId: deck._id });
  await deck.deleteOne();
  await cacheDel(decksCacheKey(req.user.id));

  res.status(200).json({ message: "Deck and associated cards deleted successfully" });
});
