import express from "express";
import {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  deleteDeck,
} from "../controller/decks.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.use(protectRoute); // All deck routes require auth

router.post("/", createDeck);
router.get("/", getDecks);
router.get("/:id", getDeckById);
router.put("/:id", updateDeck);
router.delete("/:id", deleteDeck);

export default router;
