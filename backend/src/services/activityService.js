import ActivityFeed from "../models/ActivityFeed.js";
import User from "../models/User.model.js";
import { decodeIdCursor, parsePageLimit, buildCursorPage } from "../lib/pagination.js";

export class ActivityService {
  /**
   * Publishes an activity milestone if the user has not disabled activity sharing.
   */
  static async recordActivity({
    userId,
    type,
    content,
    metadata = {},
    visibility = "PUBLIC",
  }) {
    if (!userId || !type || !content) return null;

    try {
      const user = await User.findById(userId).select("privacy").lean();
      if (!user || user.privacy?.showActivity === false) {
        return null;
      }

      return await ActivityFeed.create({
        userId,
        type,
        content,
        metadata,
        visibility,
      });
    } catch (err) {
      console.warn(`[ActivityService] Failed to record activity: ${err.message}`);
      return null;
    }
  }

  /**
   * Cursor-paginated feed returning public milestones + friends-only milestones from friends,
   * filtering out authors who have toggled privacy.showActivity = false.
   */
  static async getFeed({ currentUser, cursor = null, limit: rawLimit = 10 }) {
    const limit = parsePageLimit(rawLimit, 10, 50);
    const cursorObjId = decodeIdCursor(cursor);

    const friendIds = [...(currentUser.friends || []), currentUser._id];

    const visibilityOr = [
      { visibility: "PUBLIC" },
      { visibility: "FRIENDS_ONLY", userId: { $in: friendIds } },
    ];

    const filter = cursorObjId
      ? { $and: [{ _id: { $lt: cursorObjId } }, { $or: visibilityOr }] }
      : { $or: visibilityOr };

    const docs = await ActivityFeed.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("userId", "fullName profilePic privacy")
      .lean();

    const { items: rawItems, pagination } = buildCursorPage(docs, limit);

    const activities = rawItems
      .filter((item) => item.userId && item.userId.privacy?.showActivity !== false)
      .map((item) => ({
        _id: item._id,
        type: item.type,
        content: item.content,
        metadata: item.metadata || {},
        createdAt: item.createdAt,
        user: {
          _id: item.userId._id,
          fullName: item.userId.fullName,
          profilePic: item.userId.profilePic || "",
        },
      }));

    return {
      activities,
      pagination,
    };
  }
}
