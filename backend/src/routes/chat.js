import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getStreamToken } from "../controller/chat.js";

const router = express.Router();

router.get("/token",protectRoute,getStreamToken)

export default router;