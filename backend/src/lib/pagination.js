import mongoose from "mongoose";

export function parsePageLimit(rawLimit, defaultLimit = 20, maxLimit = 100) {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(Math.floor(parsed), maxLimit);
}

export function encodeIdCursor(id) {
  if (!id) return null;
  return Buffer.from(JSON.stringify({ id: id.toString() }), "utf8").toString("base64url");
}

export function decodeIdCursor(rawCursor) {
  if (!rawCursor || typeof rawCursor !== "string") return null;

  // Support either base64url JSON cursor or raw 24-hex ObjectId
  if (mongoose.Types.ObjectId.isValid(rawCursor) && /^[a-fA-F0-9]{24}$/.test(rawCursor)) {
    return new mongoose.Types.ObjectId(rawCursor);
  }

  try {
    const parsed = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8"));
    if (parsed?.id && mongoose.Types.ObjectId.isValid(parsed.id)) {
      return new mongoose.Types.ObjectId(parsed.id);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formats a limit+1 query result into { items, pagination: { limit, hasMore, nextCursor } }.
 */
export function buildCursorPage(docs, limit) {
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem?._id ? encodeIdCursor(lastItem._id) : null;

  return {
    items,
    pagination: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}
