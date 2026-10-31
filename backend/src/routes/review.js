import express from "express";
import { getDueCards, submitReview } from "../controller/review.js";
import { protectRoute } from "../middleware/auth.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { submitReviewSchema } from "../validators/schemas.js";

const router = express.Router();

router.use(protectRoute);

router.get("/due", getDueCards);
router.post(
  "/:id",
  validateObjectIdParam("id"),
  validateBody(submitReviewSchema),
  submitReview
);

export default router;
