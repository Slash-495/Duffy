import express from "express";
import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  bulkImportFlashcards,
} from "../controller/flashcards.js";
import { protectRoute } from "../middleware/auth.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import {
  createFlashcardSchema,
  updateFlashcardSchema,
  bulkImportFlashcardsSchema,
} from "../validators/schemas.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", validateBody(createFlashcardSchema), createFlashcard);
router.put(
  "/:id",
  validateObjectIdParam("id"),
  validateBody(updateFlashcardSchema),
  updateFlashcard
);
router.delete("/:id", validateObjectIdParam("id"), deleteFlashcard);
router.post("/import", validateBody(bulkImportFlashcardsSchema), bulkImportFlashcards);

export default router;
