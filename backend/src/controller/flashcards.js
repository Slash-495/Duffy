import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// @desc    Create a new flashcard
// @route   POST /api/flashcards
export const createFlashcard = asyncHandler(async (req, res) => {
  const { deckId, word, meaning, language, translation, exampleSentence, pronunciation, ipa, difficulty, partOfSpeech, tags, notes, source } = req.body;

  if (!deckId || !word || !meaning || !language) {
    return res.status(400).json({ message: "Deck ID, language, word, and meaning are required" });
  }

  // Verify deck belongs to user
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

  // Update deck stats
  await Deck.findByIdAndUpdate(deckId, { $inc: { "stats.totalCards": 1 } });

  res.status(201).json(card);
});

// @desc    Update a flashcard
// @route   PUT /api/flashcards/:id
export const updateFlashcard = asyncHandler(async (req, res) => {
  const updates = req.body;
  
  // Prevent updating sensitive SRS fields directly through this endpoint
  delete updates.easeFactor;
  delete updates.interval;
  delete updates.nextReviewDate;

  const card = await Flashcard.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!card) {
    return res.status(404).json({ message: "Flashcard not found" });
  }

  res.status(200).json(card);
});

// @desc    Delete a flashcard
// @route   DELETE /api/flashcards/:id
export const deleteFlashcard = asyncHandler(async (req, res) => {
  const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user.id });

  if (!card) {
    return res.status(404).json({ message: "Flashcard not found" });
  }

  await card.deleteOne();
  
  // Update deck stats
  await Deck.findByIdAndUpdate(card.deckId, { $inc: { "stats.totalCards": -1 } });

  res.status(200).json({ message: "Flashcard deleted successfully" });
});

// @desc    Bulk import flashcards (CSV/JSON parsed on client)
// @route   POST /api/flashcards/import
export const bulkImportFlashcards = asyncHandler(async (req, res) => {
  const { deckId, cards } = req.body;

  if (!deckId || !cards || !Array.isArray(cards)) {
    return res.status(400).json({ message: "Deck ID and cards array are required" });
  }

  const deck = await Deck.findOne({ _id: deckId, userId: req.user.id });
  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const newCards = cards.map(card => ({
    ...card,
    userId: req.user.id,
    deckId: deck._id,
    source: "import",
  }));

  const inserted = await Flashcard.insertMany(newCards);

  // Update deck stats
  await Deck.findByIdAndUpdate(deckId, { $inc: { "stats.totalCards": inserted.length } });

  res.status(201).json({ message: `Successfully imported ${inserted.length} cards`, count: inserted.length });
});
