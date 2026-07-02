import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  // 1. Basic validation
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

  // 2. Generate random avatar
  const idx = Math.floor(Math.random() * 100) + 1;
  const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

  // 3. Create user
  const newUser = await User.create({
    email,
    fullName,
    password,
    profilePic: randomAvatar,
  });

  // 4. Stream user setup
  try {
    await upsertStreamUser({
      id: newUser._id.toString(),
      name: newUser.fullName,
      image: newUser.profilePic || "",
    });
  } catch (error) {
    console.warn("Error in creating Stream User:", error.message);
  }

  // 5. Create JWT
  const token = jwt.sign(
    { userId: newUser._id },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" }
  );

  // 6. Set JWT cookie
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  // 7. Send success response
  res.status(201).json({ success: true, user: newUser });
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

  res.status(200).json({ success: true, user });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout Successful" });
});

export const onboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

  if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      isOnboarded: true,
    },
    { new: true, runValidators: true }
  );

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

  res.status(200).json({ success: true, user: updatedUser });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});