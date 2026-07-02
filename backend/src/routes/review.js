import express from "express";
import { getDueCards, submitReview } from "../controller/review.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/due", getDueCards);
router.post("/:id", submitReview);

export default router;
