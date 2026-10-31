import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getActivityFeed } from "../controller/activity.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getActivityFeed);

export default router;
