import rateLimit from 'express-rate-limit';

// General API rate limit (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for expensive AI endpoints (10 requests per 15 minutes for FREE users)
// Note: In a production app, we would dynamically check the user's role/subscription tier
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, 
  message: "AI quota exceeded. Please upgrade to Premium for unlimited access.",
  standardHeaders: true,
  legacyHeaders: false,
});
