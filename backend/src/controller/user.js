import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getRecommendedUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const currentUser = req.user;

  // Extract query parameters
  const { nativeLanguage, learningLanguage, location, search } = req.query;

  // Build the filter query
  const query = {
    $and: [
      { _id: { $ne: currentUserId } }, // exclude current User
      { _id: { $nin: currentUser.friends } }, // exclude friends
      { isOnboarded: true },
    ],
  };

  if (nativeLanguage) {
    query.nativeLanguage = { $regex: new RegExp(`^${nativeLanguage}$`, "i") };
  }
  
  if (learningLanguage) {
    query.learningLanguage = { $regex: new RegExp(`^${learningLanguage}$`, "i") };
  }
  
  if (location) {
    query.location = { $regex: new RegExp(location, "i") };
  }

  if (search) {
    query.fullName = { $regex: new RegExp(search, "i") };
  }

  const recommendedUsers = await User.find(query);
  res.status(200).json({ recommendedUsers });
});

export const getMyFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("friends")
    .populate("friends", "fullName profilePic nativeLanguage learningLanguage");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(user.friends);
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

  friendRequest.status = 'accepted';
  await friendRequest.save();

  await User.findByIdAndUpdate(friendRequest.sender, {
    $addToSet: { friends: friendRequest.recipient },
  });

  await User.findByIdAndUpdate(friendRequest.recipient, {
    $addToSet: { friends: friendRequest.sender },
  });

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