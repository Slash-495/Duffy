import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { PresenceService } from "../services/presenceService.js";
import { cacheAside, cacheDel } from "../lib/cache.js";
import { LeaderboardService } from "../services/leaderboardService.js";

const FRIENDS_CACHE_TTL_SECONDS = 120;

export function friendsCacheKey(userId) {
  return `cache:friends:${userId.toString()}`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getRecommendedUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const currentUser = req.user;

  const { nativeLanguage, learningLanguage, location, search } = req.query;

  const query = {
    $and: [
      { _id: { $ne: currentUserId } },
      { _id: { $nin: currentUser.friends } },
      { isOnboarded: true },
    ],
  };

  if (nativeLanguage) {
    query.nativeLanguage = { $regex: new RegExp(`^${escapeRegex(nativeLanguage)}$`, "i") };
  }

  if (learningLanguage) {
    query.learningLanguage = { $regex: new RegExp(`^${escapeRegex(learningLanguage)}$`, "i") };
  }

  if (location) {
    query.location = { $regex: new RegExp(escapeRegex(location), "i") };
  }

  if (search) {
    query.fullName = { $regex: new RegExp(escapeRegex(search), "i") };
  }

  const recommendedUsers = await User.find(query).select("-password").lean();
  const presenceMap = await PresenceService.getPresenceMap(recommendedUsers);

  const sanitized = recommendedUsers.map((u) => {
    const { privacy, ...rest } = u;
    return {
      ...rest,
      isOnline: presenceMap.get(u._id.toString()) || false,
    };
  });

  res.status(200).json({ recommendedUsers: sanitized });
});

export const getMyFriends = asyncHandler(async (req, res) => {
  const { data: rawFriends, hit } = await cacheAside(
    friendsCacheKey(req.user.id),
    FRIENDS_CACHE_TTL_SECONDS,
    async () => {
      const user = await User.findById(req.user.id)
        .select("friends")
        .populate("friends", "fullName profilePic nativeLanguage learningLanguage privacy")
        .lean();

      if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

      return user.friends || [];
    }
  );

  // Merge real-time online status via single Redis MGET while respecting privacy.showOnlineStatus
  const presenceMap = await PresenceService.getPresenceMap(rawFriends);
  const friendsWithPresence = rawFriends.map((friend) => {
    const { privacy, ...safeFriend } = friend;
    return {
      ...safeFriend,
      isOnline: presenceMap.get(friend._id.toString()) || false,
    };
  });

  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(friendsWithPresence);
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const { id: recipientId } = req.params;

  if (myId === recipientId) {
    res.status(400);
    throw new Error("You can't send Friend Request to yourself");
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  if (recipient.privacy?.allowFriendRequests === false) {
    res.status(403);
    throw new Error("This user has disabled incoming friend requests.");
  }

  if (recipient.friends.includes(myId)) {
    res.status(400);
    throw new Error("You are already friends with this user.");
  }

  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: myId, recipient: recipientId },
      { sender: recipientId, recipient: myId },
    ],
  });

  if (existingRequest) {
    res.status(400);
    throw new Error("A friend request already exist between you and this user.");
  }

  const friendRequest = await FriendRequest.create({
    sender: myId,
    recipient: recipientId,
  });

  res.status(201).json(friendRequest);
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { id: requestId } = req.params;

  if (!requestId) {
    res.status(400);
    throw new Error("Request ID is missing");
  }

  const friendRequest = await FriendRequest.findById(requestId);

  if (!friendRequest) {
    res.status(404);
    throw new Error("Friend Request Not Found");
  }

  if (friendRequest.recipient.toString() !== req.user.id) {
    res.status(403);
    throw new Error("You are not authorized to accept this request");
  }

  friendRequest.status = "accepted";
  await friendRequest.save();

  await Promise.all([
    User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    }),
    User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    }),
  ]);

  await cacheDel(
    friendsCacheKey(friendRequest.sender),
    friendsCacheKey(friendRequest.recipient)
  );

  res.status(200).json({ success: true, message: "Friend request accepted" });
});

export const getFriendRequests = asyncHandler(async (req, res) => {
  const incomingReqs = await FriendRequest.find({
    recipient: req.user.id,
    status: "pending",
  }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

  const acceptedReqs = await FriendRequest.find({
    sender: req.user.id,
    status: "accepted",
  }).populate("recipient", "fullName profilePic");

  res.status(200).json({ incomingReqs, acceptedReqs });
});

export const getoutgoingFriendReq = asyncHandler(async (req, res) => {
  const outgoingRequests = await FriendRequest.find({
    sender: req.user.id,
    status: "pending",
  }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage");

  res.status(200).json(outgoingRequests);
});

// @desc    Refresh current user's online presence TTL key
// @route   POST /api/users/presence/heartbeat
export const heartbeatPresence = asyncHandler(async (req, res) => {
  const result = await PresenceService.heartbeat(req.user);
  res.status(200).json(result);
});

// @desc    Batch query online status for the current user's friends
// @route   GET /api/users/presence
export const getFriendsPresence = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("friends")
    .populate("friends", "privacy")
    .lean();

  const friends = user?.friends || [];
  const presenceMap = await PresenceService.getPresenceMap(friends);
  const statuses = Object.fromEntries(presenceMap.entries());

  res.status(200).json({ statuses });
});

// @desc    Update privacy settings (online status visibility, activity feed, friend requests)
// @route   PUT /api/users/privacy
export const updatePrivacySettings = asyncHandler(async (req, res) => {
  const { showOnlineStatus, showActivity, showActivityFeed, allowFriendRequests } = req.body;

  const updates = {};
  if (typeof showOnlineStatus === "boolean") {
    updates["privacy.showOnlineStatus"] = showOnlineStatus;
  }
  const activityToggle =
    typeof showActivity === "boolean"
      ? showActivity
      : typeof showActivityFeed === "boolean"
      ? showActivityFeed
      : undefined;
  if (typeof activityToggle === "boolean") {
    updates["privacy.showActivity"] = activityToggle;
  }
  if (typeof allowFriendRequests === "boolean") {
    updates["privacy.allowFriendRequests"] = allowFriendRequests;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  if (updatedUser.privacy?.showOnlineStatus === false) {
    await PresenceService.clearPresence(updatedUser._id);
  } else {
    await PresenceService.heartbeat(updatedUser);
  }

  // Invalidate cached friend rosters of all connected friends so privacy change takes effect immediately
  const friendKeys = (updatedUser.friends || []).map((fid) => friendsCacheKey(fid));
  await Promise.all([
    cacheDel(...friendKeys),
    LeaderboardService.invalidateUserSummary(updatedUser._id),
  ]);

  res.status(200).json({ success: true, user: updatedUser });
});
