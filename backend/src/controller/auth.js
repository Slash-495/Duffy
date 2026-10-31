import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { PresenceService } from "../services/presenceService.js";
import { LeaderboardService } from "../services/leaderboardService.js";
import { cacheDel } from "../lib/cache.js";
import { friendsCacheKey } from "./user.js";

function sanitizeUser(userDoc) {
  const obj = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
}

export const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !fullName || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Invalid email format");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already exists");
  }

  const idx = Math.floor(Math.random() * 100) + 1;
  const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

  const newUser = await User.create({
    email,
    fullName,
    password,
    profilePic: randomAvatar,
  });

  try {
    await upsertStreamUser({
      id: newUser._id.toString(),
      name: newUser.fullName,
      image: newUser.profilePic || "",
    });
  } catch (error) {
    console.warn("Error in creating Stream User:", error.message);
  }

  const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(201).json({ success: true, user: sanitizeUser(newUser) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  await PresenceService.heartbeat(user);

  res.status(200).json({ success: true, user: sanitizeUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      if (decoded?.userId) {
        await PresenceService.clearPresence(decoded.userId);
      }
    } catch {
      // Ignore expired/invalid token on logout
    }
  }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Logout Successful" });
});

export const onboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { fullName, bio, nativeLanguage, learningLanguage, location, profilePic } = req.body;

  if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const updateFields = {
    fullName,
    bio,
    nativeLanguage,
    learningLanguage,
    location,
    isOnboarded: true,
  };
  if (profilePic) {
    updateFields.profilePic = profilePic;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  try {
    await upsertStreamUser({
      id: updatedUser._id.toString(),
      name: updatedUser.fullName,
      image: updatedUser.profilePic || "",
    });
  } catch (streamError) {
    console.warn("Error updating Stream user during onboarding:", streamError.message);
  }

  const friendKeys = (updatedUser.friends || []).map((fid) => friendsCacheKey(fid));
  await Promise.all([
    LeaderboardService.invalidateUserSummary(userId),
    cacheDel(...friendKeys),
  ]);

  res.status(200).json({ success: true, user: updatedUser });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});
