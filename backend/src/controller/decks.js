import Deck from "../models/Deck.js";
import Flashcard from "../models/Flashcard.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

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

  res.status(201).json(deck);
});

// @desc    Get all decks for a user
// @route   GET /api/decks
export const getDecks = asyncHandler(async (req, res) => {
  const decks = await Deck.find({ userId: req.user.id, isArchived: false }).sort({ updatedAt: -1 });
  
  // Optionally, we could aggregate stats here, but we'll cache them in the model for speed
  res.status(200).json(decks);
});

// @desc    Get a single deck with its cards
// @route   GET /api/decks/:id
export const getDeckById = asyncHandler(async (req, res) => {
  const deck = await Deck.findOne({ _id: req.params.id, userId: req.user.id });

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const cards = await Flashcard.find({ deckId: deck._id }).sort({ createdAt: -1 });

  res.status(200).json({ deck, cards });
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

  res.status(200).json(deck);
});

// @desc    Delete a deck and all its cards
// @route   DELETE /api/decks/:id
export const deleteDeck = asyncHandler(async (req, res) => {
  const deck = await Deck.findOne({ _id: req.params.id, userId: req.user.id });

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  // Delete all associated flashcards
  await Flashcard.deleteMany({ deckId: deck._id });
  
  await deck.deleteOne();

  res.status(200).json({ message: "Deck and associated cards deleted successfully" });
});
