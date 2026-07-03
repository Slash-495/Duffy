import mongoose from "mongoose";

const forumReplySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    isAcceptedAnswer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const forumPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["Grammar", "Vocabulary", "General", "Feedback"],
      default: "General"
    },
    tags: [String],
    upvotes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    replies: [forumReplySchema],
  },
  { timestamps: true }
);

const ForumPost = mongoose.model("ForumPost", forumPostSchema);
export default ForumPost;
