import { asyncHandler } from "../middleware/asyncHandler.js";
import { ActivityService } from "../services/activityService.js";

// @desc    Get cursor-paginated community & friend activity feed
// @route   GET /api/activity
export const getActivityFeed = asyncHandler(async (req, res) => {
  const { cursor = null, limit = 10 } = req.query;
  const result = await ActivityService.getFeed({
    currentUser: req.user,
    cursor,
    limit,
  });

  res.status(200).json(result);
});
