import { generateStreamToken } from "../lib/stream.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getStreamToken = asyncHandler(async (req, res) => {
  const token = generateStreamToken(req.user.id);
  res.status(200).json({ token });
});