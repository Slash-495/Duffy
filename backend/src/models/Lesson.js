import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["grammar", "vocabulary", "culture"],
      required: true,
    },
    level: {
      type: String, // A1, A2, etc.
      required: true,
    },
    content: {
      explanation: String,
      examples: [
        {
          original: String,
          translation: String,
          audioUrl: String,
        }
      ],
    },
    isPreSeeded: {
      type: Boolean,
      default: false, // Standard topics are pre-seeded, personalized ones are false
    },
    personalizedForUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Null if it's a global standard lesson
    }
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
