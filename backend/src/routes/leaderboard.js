import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getLeaderboard } from "../controller/leaderboard.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getLeaderboard);

export default router;
