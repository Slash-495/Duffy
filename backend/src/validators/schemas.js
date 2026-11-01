import { z } from "zod";
import mongoose from "mongoose";

const objectIdString = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId",
  });

// Auth Schemas
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email format").max(254),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  bio: z.string().trim().min(1, "Bio is required").max(500),
  nativeLanguage: z.string().trim().min(1, "Native language is required").max(50),
  learningLanguage: z.string().trim().min(1, "Learning language is required").max(50),
  location: z.string().trim().min(1, "Location is required").max(120),
  profilePic: z.string().trim().url().max(500).optional().or(z.literal("")),
});

// User Privacy Schema
export const privacySettingsSchema = z.object({
  showOnlineStatus: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showActivityFeed: z.boolean().optional(),
  allowFriendRequests: z.boolean().optional(),
});

// Deck Schemas
export const createDeckSchema = z.object({
  name: z.string().trim().min(1, "Deck name is required").max(100),
  description: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
});

export const updateDeckSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  isArchived: z.boolean().optional(),
});

// Flashcard Schemas (whitelisted fields prevent mass assignment of SRS/owner fields)
export const createFlashcardSchema = z.object({
  deckId: objectIdString,
  word: z.string().trim().min(1, "Word is required").max(200),
  meaning: z.string().trim().min(1, "Meaning is required").max(500),
  language: z.string().trim().min(1, "Language is required").max(50),
  translation: z.string().trim().max(500).optional().default(""),
  exampleSentence: z.string().trim().max(500).optional().default(""),
  pronunciation: z.string().trim().max(150).optional().default(""),
  ipa: z.string().trim().max(150).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  partOfSpeech: z.string().trim().max(50).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  notes: z.string().trim().max(1000).optional().default(""),
  source: z.enum(["manual", "chat", "import", "ai"]).optional().default("manual"),
});

export const updateFlashcardSchema = z.object({
  word: z.string().trim().min(1).max(200).optional(),
  meaning: z.string().trim().min(1).max(500).optional(),
  language: z.string().trim().min(1).max(50).optional(),
  translation: z.string().trim().max(500).optional(),
  exampleSentence: z.string().trim().max(500).optional(),
  pronunciation: z.string().trim().max(150).optional(),
  ipa: z.string().trim().max(150).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  partOfSpeech: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  notes: z.string().trim().max(1000).optional(),
  isFavorite: z.boolean().optional(),
});

export const bulkImportFlashcardsSchema = z.object({
  deckId: objectIdString,
  cards: z
    .array(
      z.object({
        word: z.string().trim().min(1).max(200),
        meaning: z.string().trim().min(1).max(500),
        language: z.string().trim().min(1).max(50),
        translation: z.string().trim().max(500).optional().default(""),
        exampleSentence: z.string().trim().max(500).optional().default(""),
        pronunciation: z.string().trim().max(150).optional().default(""),
        ipa: z.string().trim().max(150).optional().default(""),
        difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
        partOfSpeech: z.string().trim().max(50).optional().default(""),
        tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
        notes: z.string().trim().max(1000).optional().default(""),
      })
    )
    .min(1, "At least one flashcard is required")
    .max(200, "Bulk import is capped at 200 cards per request"),
});

// Review Schema
export const submitReviewSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

// AI Schemas
export const aiMessageSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  targetLanguage: z.string().trim().max(50).optional(),
  sourceLanguage: z.string().trim().max(50).optional(),
});

export const aiAnalyzeSchema = z.object({
  chatTranscript: z.string().trim().min(1, "Conversation transcript is required").max(15_000),
  targetLanguage: z.string().trim().max(50).optional(),
});

export const aiPronunciationSchema = z.object({
  transcript: z.string().trim().min(1, "Spoken transcript is required").max(1000),
  targetLanguage: z.string().trim().max(50).optional(),
  targetPhrase: z.string().trim().max(1000).optional(),
});

export const roleplayTurnSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "ai", "assistant", "system"]),
        text: z.string().trim().min(1).max(2000),
      })
    )
    .min(1, "Conversation history cannot be empty")
    .max(40, "Conversation history exceeds maximum turn limit"),
  targetLanguage: z.string().trim().max(50).optional(),
  cefrLevel: z.string().trim().max(20).optional(),
  scenario: z.string().trim().max(200).optional(),
});

// Learning Schemas
export const awardXPSchema = z.object({
  amount: z.number().int().min(1, "XP must be at least 1").max(100, "Single XP award cannot exceed 100"),
});

export const generateQuizSchema = z.object({
  topic: z.string().trim().min(2, "Quiz topic is required").max(150),
  targetLanguage: z.string().trim().max(50).optional().default("English"),
});

// Classroom Schemas
export const createClassroomSchema = z.object({
  name: z.string().trim().min(2, "Classroom name is required").max(120),
});

export const joinClassroomSchema = z.object({
  joinCode: z.string().trim().min(4).max(12),
});

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(2, "Assignment title is required").max(150),
  description: z.string().trim().max(1000).optional().default(""),
  type: z.enum(["FLASHCARD_REVIEW", "AI_CONVERSATION", "GRAMMAR_QUIZ"]),
  targetId: objectIdString.optional(),
  dueDate: z.coerce.date(),
});
