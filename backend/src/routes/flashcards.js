import express from "express";
import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  bulkImportFlashcards,
} from "../controller/flashcards.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createFlashcard);
router.put("/:id", updateFlashcard);
router.delete("/:id", deleteFlashcard);
router.post("/import", bulkImportFlashcards);

export default router;
