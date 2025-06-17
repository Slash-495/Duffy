import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";

export async function signup(req, res) {
  const {
    email,
    password,
    fullName,
  } = req.body;

  try {
    // 1. Basic validation
    if (
      !email ||
      !fullName ||
      !password 
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
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
      console.log(` Stream User Created for ${newUser.fullName}`);
    } catch (error) {
      console.log(" Error in creating Stream User:", error.message);
    }

    // 5. Create JWT
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      }
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
  } catch (error) {
    console.log(" Error in Signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req,res){
    try {
        const {email,password} = req.body;
        
        if(!email || !password){
          return res.status(400).json({message: "All fields are Required"})
        }

        const user = await User.findOne({email})
        if(!user){
          return res.status(401).json({message: "Invalid email or password"})
        }
        const isPasswordCorrect = await user.matchPassword(password);
        if(!isPasswordCorrect) return res.status(401).json({message: "Invalid email or password"})

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d"
    });
      res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
      });
      res.status(200).json({success:true, user})
    } catch (error) {
        console.log("Error in login control",error.message)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export function logout(req,res){
    res.clearCookie("jwt");
    res.status(200).json({success: true, message: "Logout Successful"})
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;

    const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location",
        ].filter(Boolean),
      });
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

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}