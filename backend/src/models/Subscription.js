import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    tier: {
      type: String,
      enum: ["FREE", "PREMIUM", "PRO"],
      default: "FREE",
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled", "incomplete", "trialing", "none"],
      default: "none",
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    features: {
      // Feature overrides for specific users, overrides standard tier defaults
      unlimitedAI: { type: Boolean, default: false },
      earlyAccess: { type: Boolean, default: false },
    }
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
