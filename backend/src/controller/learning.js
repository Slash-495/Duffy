import { asyncHandler } from "../middleware/asyncHandler.js";
import { AnalyticsEngine } from "../services/learning/AnalyticsEngine.js";
import { LearningEngine } from "../services/learning/LearningEngine.js";
import { QuizEngine } from "../services/learning/QuizEngine.js";

// @desc    Get user's learning profile (XP, streaks)
// @route   GET /api/learning/profile
export const getLearningProfile = asyncHandler(async (req, res) => {
  const { data: profile, hit } = await AnalyticsEngine.getProfileWithCacheMeta(req.user._id);
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(profile);
});

// @desc    Award XP to user
// @route   POST /api/learning/xp
export const awardXP = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await AnalyticsEngine.awardXP(req.user._id, amount);
  res.status(200).json(result);
});

// @desc    Get personalized roadmap
// @route   GET /api/learning/roadmap
export const getRoadmap = asyncHandler(async (req, res) => {
  const profile = await AnalyticsEngine.getProfile(req.user._id);
  const { data: roadmap, hit } = await LearningEngine.getRoadmapWithCacheMeta(profile.currentCEFR);
  const missions = LearningEngine.generateDailyMissions();

  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json({ roadmap, missions });
});

// @desc    Generate dynamic AI quiz
// @route   POST /api/learning/quiz
export const generateQuiz = asyncHandler(async (req, res) => {
  const { topic, targetLanguage } = req.body;
  const { data: quiz, hit } = await QuizEngine.generateQuizWithCacheMeta(topic, targetLanguage);
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.status(200).json(quiz);
});
