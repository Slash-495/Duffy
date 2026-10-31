import express from "express";
import {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  deleteDeck,
} from "../controller/decks.js";
import { protectRoute } from "../middleware/auth.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { createDeckSchema, updateDeckSchema } from "../validators/schemas.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", validateBody(createDeckSchema), createDeck);
router.get("/", getDecks);
router.get("/:id", validateObjectIdParam("id"), getDeckById);
router.put("/:id", validateObjectIdParam("id"), validateBody(updateDeckSchema), updateDeck);
router.delete("/:id", validateObjectIdParam("id"), deleteDeck);

export default router;
