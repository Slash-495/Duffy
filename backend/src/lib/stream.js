import { StreamChat } from "stream-chat";
import "dotenv/config";
import { AppError } from "./AppError.js";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.warn("[Stream] STREAM_API_KEY or STREAM_API_SECRET is not configured.");
}

const streamClient = apiKey && apiSecret ? StreamChat.getInstance(apiKey, apiSecret) : null;

export const upsertStreamUser = async (userData) => {
  if (!streamClient) return null;
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.warn("[Stream] Failed to upsert Stream user:", error.message);
    return null;
  }
};

export const generateStreamToken = (userId) => {
  if (!streamClient) {
    throw new AppError("Chat and video service is currently unconfigured.", 503);
  }
  const userIdStr = userId.toString();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + 24 * 60 * 60; // 24-hour token expiry
  const iat = nowSeconds - 60; // 60s clock-skew leeway
  return streamClient.createToken(userIdStr, exp, iat);
};
