import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    bio: {
      type: String,
      required: [true, "Bio is required"],
      default: "New user",
      validate: {
        validator: function (v) {
          return v && v.trim().length > 0;
        },
        message: "Bio cannot be empty",
      },
    },
    profilePic: {
      type: String,
      default: "",
    },
    nativeLanguage: {
      type: String,
      default: "English",
    },
    learningLanguage: {
      type: String,
      default: "None",
    },
    location: {
      type: String,
      default: "Unknown",
    },
    timezone: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: null,
    },
    interests: {
      type: [String],
      default: [],
    },
    learningGoals: {
      type: String,
      default: "",
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    role: {
      type: String,
      enum: ["USER", "PREMIUM", "TEACHER", "ADMIN"],
      default: "USER",
    },
    privacy: {
      showActivity: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      allowFriendRequests: { type: Boolean, default: true },
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Compound indexes for partner discovery and RBAC filtering
userSchema.index({ isOnboarded: 1, nativeLanguage: 1, learningLanguage: 1, _id: -1 });
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);

export default User;
