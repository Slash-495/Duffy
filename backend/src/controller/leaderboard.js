import { asyncHandler } from "../middleware/asyncHandler.js";
import { LeaderboardService } from "../services/leaderboardService.js";

// @desc    Get global leaderboard (Redis Sorted Set with MongoDB fallback)
// @route   GET /api/leaderboard
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { period = "weekly", limit = 20, cursor = null } = req.query;

  const data = await LeaderboardService.getLeaderboard({
    period,
    limit,
    cursor,
    currentUserId: req.user?._id,
  });

  res.setHeader("X-Leaderboard-Source", data.source);
  res.status(200).json(data);
});
