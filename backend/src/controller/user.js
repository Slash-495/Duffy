import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { PresenceService } from "../services/presenceService.js";
import { cacheAside, cacheDel } from "../lib/cache.js";
import { LeaderboardService } from "../services/leaderboardService.js";
import {
  decodeIdCursor,
  parsePageLimit,
  buildCursorPage,
  encodeIdCursor,
} from "../lib/pagination.js";

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

  const { nativeLanguage, learningLanguage, location, search, cursor } = req.query;
  const limit = parsePageLimit(req.query.limit, 24, 50);
  const cursorId = decodeIdCursor(cursor);

  const andClauses = [
    { _id: { $ne: currentUserId } },
    { _id: { $nin: currentUser.friends } },
    { isOnboarded: true },
  ];

  if (cursorId) {
    andClauses.push({ _id: { $lt: cursorId } });
  }

  const query = { $and: andClauses };

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

  const docs = await User.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("-password")
    .lean();

  const { items, pagination } = buildCursorPage(docs, limit);
  const presenceMap = await PresenceService.getPresenceMap(items);

  const sanitized = items.map((u) => {
    const { privacy, ...rest } = u;
    return {
      ...rest,
      isOnline: presenceMap.get(u._id.toString()) || false,
    };
  });

  res.status(200).json({ recommendedUsers: sanitized, pagination });
});

export const getMyFriends = asyncHandler(async (req, res) => {
  const limit = parsePageLimit(req.query.limit, 50, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

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

      const sorted = [...(user.friends || [])].sort((a, b) =>
        b._id.toString().localeCompare(a._id.toString())
      );
      return sorted;
    }
  );

  let filtered = rawFriends;
  if (cursorId) {
    const cursorStr = cursorId.toString();
    filtered = rawFriends.filter((f) => f._id.toString() < cursorStr);
  }

  const hasMore = filtered.length > limit;
  const pageSlice = hasMore ? filtered.slice(0, limit) : filtered;
  const nextCursor =
    hasMore && pageSlice.length > 0
      ? encodeIdCursor(pageSlice[pageSlice.length - 1]._id)
      : null;

  const presenceMap = await PresenceService.getPresenceMap(pageSlice);
  const friendsWithPresence = pageSlice.map((friend) => {
    const { privacy, ...safeFriend } = friend;
    return {
      ...safeFriend,
      isOnline: presenceMap.get(friend._id.toString()) || false,
    };
  });

  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.setHeader("X-Has-More", String(hasMore));
  if (nextCursor) {
    res.setHeader("X-Next-Cursor", nextCursor);
  }
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
  const limit = parsePageLimit(req.query.limit, 30, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

  const incomingFilter = {
    recipient: req.user.id,
    status: "pending",
    ...(cursorId ? { _id: { $lt: cursorId } } : {}),
  };

  const acceptedFilter = {
    sender: req.user.id,
    status: "accepted",
    ...(cursorId ? { _id: { $lt: cursorId } } : {}),
  };

  const [incomingDocs, acceptedDocs] = await Promise.all([
    FriendRequest.find(incomingFilter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("sender", "fullName profilePic nativeLanguage learningLanguage")
      .lean(),
    FriendRequest.find(acceptedFilter)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("recipient", "fullName profilePic")
      .lean(),
  ]);

  const { items: incomingReqs, pagination } = buildCursorPage(incomingDocs, limit);

  res.status(200).json({ incomingReqs, acceptedReqs: acceptedDocs, pagination });
});

export const getoutgoingFriendReq = asyncHandler(async (req, res) => {
  const limit = parsePageLimit(req.query.limit, 50, 100);
  const cursorId = decodeIdCursor(req.query.cursor);

  const filter = {
    sender: req.user.id,
    status: "pending",
    ...(cursorId ? { _id: { $lt: cursorId } } : {}),
  };

  const docs = await FriendRequest.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("recipient", "fullName profilePic nativeLanguage learningLanguage")
    .lean();

  const { items, pagination } = buildCursorPage(docs, limit);
  res.setHeader("X-Has-More", String(pagination.hasMore));
  if (pagination.nextCursor) {
    res.setHeader("X-Next-Cursor", pagination.nextCursor);
  }
  res.status(200).json(items);
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

// @desc    Update privacy settings
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

  const friendKeys = (updatedUser.friends || []).map((fid) => friendsCacheKey(fid));
  await Promise.all([
    cacheDel(...friendKeys),
    LeaderboardService.invalidateUserSummary(updatedUser._id),
  ]);

  res.status(200).json({ success: true, user: updatedUser });
});
