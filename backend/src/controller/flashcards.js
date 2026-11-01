import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { cacheDel } from "../lib/cache.js";
import { decksCacheKey } from "./decks.js";

// @desc    Create a new flashcard
// @route   POST /api/flashcards
export const createFlashcard = asyncHandler(async (req, res) => {
  const {
    deckId,
    word,
    meaning,
    language,
    translation,
    exampleSentence,
    pronunciation,
    ipa,
    difficulty,
    partOfSpeech,
    tags,
    notes,
    source,
  } = req.body;

  const deck = await Deck.findOne({ _id: deckId, userId: req.user.id });
  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const card = await Flashcard.create({
    userId: req.user.id,
    deckId,
    language,
    word,
    meaning,
    translation,
    exampleSentence,
    pronunciation,
    ipa,
    difficulty,
    partOfSpeech,
    tags,
    notes,
    source,
  });

  await Deck.findByIdAndUpdate(deckId, {
    $inc: { "stats.totalCards": 1, "stats.dueCards": 1 },
  });
  await cacheDel(decksCacheKey(req.user.id));

  res.status(201).json(card);
});

// @desc    Update a flashcard
// @route   PUT /api/flashcards/:id
export const updateFlashcard = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  delete updates.easeFactor;
  delete updates.interval;
  delete updates.repetitions;
  delete updates.reviewCount;
  delete updates.nextReviewDate;

  const card = await Flashcard.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!card) {
    return res.status(404).json({ message: "Flashcard not found" });
  }

  await cacheDel(decksCacheKey(req.user.id));

  res.status(200).json(card);
});

// @desc    Delete a flashcard
// @route   DELETE /api/flashcards/:id
export const deleteFlashcard = asyncHandler(async (req, res) => {
  const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user.id });

  if (!card) {
    return res.status(404).json({ message: "Flashcard not found" });
  }

  const wasDue = !card.nextReviewDate || new Date(card.nextReviewDate) <= new Date();
  await card.deleteOne();

  const incUpdate = { "stats.totalCards": -1 };
  if (wasDue && (await Deck.exists({ _id: card.deckId, "stats.dueCards": { $gt: 0 } }))) {
    incUpdate["stats.dueCards"] = -1;
  }

  await Deck.findByIdAndUpdate(card.deckId, { $inc: incUpdate });
  await cacheDel(decksCacheKey(req.user.id));

  res.status(200).json({ message: "Flashcard deleted successfully" });
});

// @desc    Bulk import flashcards (CSV/JSON parsed on client)
// @route   POST /api/flashcards/import
export const bulkImportFlashcards = asyncHandler(async (req, res) => {
  const { deckId, cards } = req.body;

  const deck = await Deck.findOne({ _id: deckId, userId: req.user.id });
  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const newCards = cards.map((card) => ({
    ...card,
    userId: req.user.id,
    deckId: deck._id,
    source: "import",
  }));

  const inserted = await Flashcard.insertMany(newCards);

  await Deck.findByIdAndUpdate(deckId, {
    $inc: { "stats.totalCards": inserted.length, "stats.dueCards": inserted.length },
  });
  await cacheDel(decksCacheKey(req.user.id));

  res.status(201).json({
    message: `Successfully imported ${inserted.length} cards`,
    count: inserted.length,
  });
});
