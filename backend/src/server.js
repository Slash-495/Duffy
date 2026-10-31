import express from "express";
import dotenv from "dotenv";
dotenv.config();
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import deckRoutes from "./routes/decks.js";
import flashcardRoutes from "./routes/flashcards.js";
import reviewRoutes from "./routes/review.js";
import aiRoutes from "./routes/ai.js";
import learningRoutes from "./routes/learning.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import activityRoutes from "./routes/activity.js";
import classroomRoutes from "./routes/classroom.js";
import { getHealthStatus } from "./controller/health.js";
import { connectDB } from "./lib/db.js";
import { connectRedis } from "./lib/redis.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { AppError } from "./lib/AppError.js";

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Build explicit CORS allow-list from env vars (comma-separated supported)
const configuredOrigins = [
  ...(process.env.CORS_ORIGINS || "").split(","),
  process.env.CLIENT_URL || "",
  process.env.CLIENT_URI || "",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
]
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use((req, res, next) => {
  cors({
    origin(origin, callback) {
      // Allow server-to-server, curl, and health probe requests without Origin header
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.has(normalized)) {
        return callback(null, true);
      }

      // Allow genuine same-origin requests when SPA & API share the same host (e.g., Render single-service)
      try {
        const originUrl = new URL(normalized);
        if (req.get("host") && originUrl.host === req.get("host")) {
          return callback(null, true);
        }
      } catch {
        // Invalid Origin URL falls through to 403
      }

      return callback(new AppError(`Origin ${origin} not allowed by CORS policy`, 403));
    },
    credentials: true,
  })(req, res, next);
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

// Health endpoints (exempt from general API rate limit for orchestrator probes)
app.get("/health", getHealthStatus);
app.get("/api/health", getHealthStatus);

app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/classrooms", classroomRoutes);

// Serve built SPA when deployed as a single web service (e.g., Render) with frontend/dist built
const frontendDistPath = path.join(__dirname, "../frontend/dist");
const frontendIndexHtml = path.join(frontendDistPath, "index.html");
if (process.env.NODE_ENV !== "test" && fs.existsSync(frontendIndexHtml)) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api|health).*/, (req, res) => {
    res.sendFile(frontendIndexHtml);
  });
}

app.use(notFound);
app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
    connectDB();
    connectRedis();
  });
}
