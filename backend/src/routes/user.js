import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  getMyFriends,
  getRecommendedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriendRequests,
  getoutgoingFriendReq,
  heartbeatPresence,
  getFriendsPresence,
  updatePrivacySettings,
} from "../controller/user.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);

router.post("/presence/heartbeat", heartbeatPresence);
router.get("/presence", getFriendsPresence);
router.put("/privacy", updatePrivacySettings);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getoutgoingFriendReq);

export default router;
