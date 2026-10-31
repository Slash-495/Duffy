import { getRedisClient } from "../lib/redis.js";

export const PRESENCE_TTL_SECONDS = 90;

// Graceful in-memory fallback map (userId -> expiryEpochMs) used only when Redis is unavailable
const fallbackPresence = new Map();

function presenceKey(userId) {
  return `presence:user:${userId.toString()}`;
}

function pruneFallbackPresence(now) {
  if (fallbackPresence.size > 5000) {
    for (const [k, exp] of fallbackPresence.entries()) {
      if (exp <= now) fallbackPresence.delete(k);
    }
  }
}

export class PresenceService {
  /**
   * Refreshes a user's presence TTL key unless their privacy setting hides online status.
   */
  static async heartbeat(user) {
    if (!user?._id) {
      return { online: false, hidden: true, ttl: 0 };
    }

    const userIdStr = user._id.toString();
    const showOnline = user.privacy?.showOnlineStatus !== false;

    if (!showOnline) {
      await this.clearPresence(userIdStr);
      return { online: false, hidden: true, ttl: 0 };
    }

    const client = getRedisClient();
    const nowIso = new Date().toISOString();

    if (client) {
      try {
        await client.set(presenceKey(userIdStr), nowIso, "EX", PRESENCE_TTL_SECONDS);
        return { online: true, hidden: false, ttl: PRESENCE_TTL_SECONDS };
      } catch (err) {
        console.warn(`[Presence] Redis SET failed, falling back to memory: ${err.message}`);
      }
    }

    const now = Date.now();
    pruneFallbackPresence(now);
    fallbackPresence.set(userIdStr, now + PRESENCE_TTL_SECONDS * 1000);
    return { online: true, hidden: false, ttl: PRESENCE_TTL_SECONDS };
  }

  static async clearPresence(userId) {
    if (!userId) return;
    const userIdStr = userId.toString();
    fallbackPresence.delete(userIdStr);

    const client = getRedisClient();
    if (client) {
      try {
        await client.del(presenceKey(userIdStr));
      } catch (err) {
        console.warn(`[Presence] Redis DEL failed: ${err.message}`);
      }
    }
  }

  /**
   * Resolves online status for a list of user documents in a single Redis MGET round-trip,
   * strictly respecting each user's privacy.showOnlineStatus setting.
   * @param {Array<{_id: any, privacy?: {showOnlineStatus?: boolean}}>} users
   * @returns {Promise<Map<string, boolean>>}
   */
  static async getPresenceMap(users = []) {
    const result = new Map();
    if (!Array.isArray(users) || users.length === 0) {
      return result;
    }

    const visibleUsers = [];
    for (const u of users) {
      if (!u?._id) continue;
      const idStr = u._id.toString();
      if (u.privacy?.showOnlineStatus === false) {
        result.set(idStr, false);
      } else {
        visibleUsers.push(idStr);
      }
    }

    if (visibleUsers.length === 0) {
      return result;
    }

    const client = getRedisClient();
    if (client) {
      try {
        const keys = visibleUsers.map((id) => presenceKey(id));
        const values = await client.mget(...keys);
        visibleUsers.forEach((idStr, idx) => {
          result.set(idStr, values[idx] !== null);
        });
        return result;
      } catch (err) {
        console.warn(`[Presence] Redis MGET failed, falling back to memory: ${err.message}`);
      }
    }

    const now = Date.now();
    for (const idStr of visibleUsers) {
      const exp = fallbackPresence.get(idStr);
      if (exp && exp > now) {
        result.set(idStr, true);
      } else {
        if (exp) fallbackPresence.delete(idStr);
        result.set(idStr, false);
      }
    }

    return result;
  }
}
