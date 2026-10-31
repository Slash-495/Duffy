# Duffy Architecture & Codebase Audit (Phase 0)

> **Scope:** Complete static audit of `backend/` and `frontend/` prior to any code changes (commit `47da8fa`).

---

## 1. Backend Inventory

### 1.1 Mounted Express Routes & Controllers

Entry point: `backend/src/server.js` mounts 8 route modules under `/api/*` (27 total endpoints).

| Route File | Method & Path | Auth Middleware | Controller (`backend/src/controller/*`) | Downstream Service / Model |
|---|---|---|---|---|
| `routes/auth.js` | `POST /api/auth/signup` | Public | `auth.signup` | `User.findOne`, `User.create`, `upsertStreamUser` (`lib/stream.js`) |
| `routes/auth.js` | `POST /api/auth/login` | Public | `auth.login` | `User.findOne`, `user.matchPassword` |
| `routes/auth.js` | `POST /api/auth/logout` | Public | `auth.logout` | Clears `jwt` cookie |
| `routes/auth.js` | `POST /api/auth/onboarding` | `protectRoute` | `auth.onboard` | `User.findByIdAndUpdate`, `upsertStreamUser` |
| `routes/auth.js` | `GET /api/auth/me` | `protectRoute` | `auth.getMe` | Returns `req.user` |
| `routes/user.js` | `GET /api/users` | `protectRoute` | `user.getRecommendedUsers` | `User.find` (regex filters) |
| `routes/user.js` | `GET /api/users/friends` | `protectRoute` | `user.getMyFriends` | `User.findById(...).populate("friends")` |
| `routes/user.js` | `POST /api/users/friend-request/:id` | `protectRoute` | `user.sendFriendRequest` | `User.findById`, `FriendRequest.findOne`, `FriendRequest.create` |
| `routes/user.js` | `PUT /api/users/friend-request/:id/accept` | `protectRoute` | `user.acceptFriendRequest` | `FriendRequest.findById`, `User.findByIdAndUpdate` (x2) |
| `routes/user.js` | `GET /api/users/friend-requests` | `protectRoute` | `user.getFriendRequests` | `FriendRequest.find` (incoming pending + outgoing accepted) |
| `routes/user.js` | `GET /api/users/outgoing-friend-requests` | `protectRoute` | `user.getoutgoingFriendReq` | `FriendRequest.find` (outgoing pending) |
| `routes/chat.js` | `GET /api/chat/token` | `protectRoute` | `chat.getStreamToken` | `generateStreamToken` (`lib/stream.js`) |
| `routes/decks.js` | `POST /api/decks` | `protectRoute` | `decks.createDeck` | `Deck.create` |
| `routes/decks.js` | `GET /api/decks` | `protectRoute` | `decks.getDecks` | `Deck.find({ userId, isArchived: false })` |
| `routes/decks.js` | `GET /api/decks/:id` | `protectRoute` | `decks.getDeckById` | `Deck.findOne`, `Flashcard.find({ deckId })` |
| `routes/decks.js` | `PUT /api/decks/:id` | `protectRoute` | `decks.updateDeck` | `Deck.findOneAndUpdate` |
| `routes/decks.js` | `DELETE /api/decks/:id` | `protectRoute` | `decks.deleteDeck` | `Deck.findOne`, `Flashcard.deleteMany`, `deck.deleteOne` |
| `routes/flashcards.js` | `POST /api/flashcards` | `protectRoute` | `flashcards.createFlashcard` | `Deck.findOne`, `Flashcard.create`, `Deck.findByIdAndUpdate` |
| `routes/flashcards.js` | `PUT /api/flashcards/:id` | `protectRoute` | `flashcards.updateFlashcard` | `Flashcard.findOneAndUpdate` |
| `routes/flashcards.js` | `DELETE /api/flashcards/:id` | `protectRoute` | `flashcards.deleteFlashcard` | `Flashcard.findOne`, `card.deleteOne`, `Deck.findByIdAndUpdate` |
| `routes/flashcards.js` | `POST /api/flashcards/import` | `protectRoute` | `flashcards.bulkImportFlashcards` | `Deck.findOne`, `Flashcard.insertMany`, `Deck.findByIdAndUpdate` |
| `routes/review.js` | `GET /api/review/due` | `protectRoute` | `review.getDueCards` | `Flashcard.find({ userId, nextReviewDate: { $lte: now } })` |
| `routes/review.js` | `POST /api/review/:id` | `protectRoute` | `review.submitReview` | `Flashcard.findOne`, `calculateNextReview` (`srsService.js`), `card.save` |
| `routes/ai.js` | `POST /api/ai/grammar` | `protectRoute` | `ai.checkGrammar` | `GrammarService.check` -> `GeminiAdapter.generateText` |
| `routes/ai.js` | `POST /api/ai/vocabulary` | `protectRoute` | `ai.suggestVocabulary` | `VocabularyService.suggest` -> `GeminiAdapter.generateText` |
| `routes/ai.js` | `POST /api/ai/translate` | `protectRoute` | `ai.translateMessage` | `TranslationService.translate` -> `GeminiAdapter.generateText` |
| `routes/ai.js` | `POST /api/ai/analyze` | `protectRoute` | `ai.analyzeConversation` | `AnalyzerService.analyzeConversation` -> `GeminiAdapter.generateText` |
| `routes/ai.js` | `GET /api/ai/stream-explain` | `protectRoute` | `ai.streamExplanation` | `GeminiAdapter.generateStream` (SSE) |
| `routes/ai.js` | `POST /api/ai/roleplay/turn` | `protectRoute` | `ai.roleplayTurn` | `RoleplayService.processTurn` -> `GeminiAdapter.generateText` |
| `routes/learning.js` | `GET /api/learning/profile` | `protectRoute` | `learning.getLearningProfile` | `AnalyticsEngine.getProfile` -> `LearningProfile` |
| `routes/learning.js` | `POST /api/learning/xp` | `protectRoute` | `learning.awardXP` | `AnalyticsEngine.awardXP` -> `LearningProfile` |
| `routes/learning.js` | `GET /api/learning/roadmap` | `protectRoute` | `learning.getRoadmap` | `AnalyticsEngine.getProfile`, `LearningEngine.getRoadmap` -> `Lesson` |
| `routes/learning.js` | `POST /api/learning/quiz` | `protectRoute` | `learning.generateQuiz` | `QuizEngine.generateQuiz` -> `GeminiAdapter.generateText` |

*(Total: 33 endpoints across 8 routers.)*

### 1.2 Dead / Unmounted Backend Modules

- `backend/src/middleware/rateLimiter.js`: Defines `apiLimiter` and `aiLimiter` (`express-rate-limit`), **never imported anywhere**.
- `backend/src/middleware/cache.js`: Defines in-memory `Map` `cacheMiddleware`, **never imported anywhere** (also unsafe if mounted on authenticated endpoints because keys ignore `req.user._id` and the `Map` has no max-size eviction).
- `backend/src/services/learning/VoiceAnalysisService.js`: Mock Deepgram stub returning hardcoded Spanish `"Hola, ¿cómo estás?"` scores, **never called by any controller or route**.
- `backend/src/services/premium/FeatureFlagService.js`: Reads `Subscription` tier limits (`FREE` / `PREMIUM` / `PRO`), only called inside unused `VoiceAnalysisService` and unused `RoleplayService.startScenario` (which fetches `limits` and discards the return value).
- `backend/src/services/aiExtensionPoints.js`: Unused stub file.

### 1.3 Mongoose Models Inventory (14 Defined, 7 Active, 7 Orphaned)

| Model (`backend/src/models/*`) | Status | Existing Indexes | Notes |
|---|---|---|---|
| `User.model.js` (`User`) | Active | `email: 1` (unique) | `password` lacks `select: false`; `role` and `privacy` fields unused by backend |
| `FriendRequest.js` (`FriendRequest`) | Active | `{sender:1, recipient:1}`, `{recipient:1, status:1}`, `{sender:1, status:1}` | `{sender:1, recipient:1}` is not `unique: true` |
| `Deck.js` (`Deck`) | Active | `userId: 1`, `{userId:1, isArchived:1}` | `stats.dueCards` and `stats.masteredCards` are never updated |
| `Flashcard.js` (`Flashcard`) | Active | `userId: 1`, `deckId: 1`, `nextReviewDate: 1`, `{userId:1, nextReviewDate:1}`, `{userId:1, deckId:1}`, text index | Missing `{userId:1, deckId:1, nextReviewDate:1}` for deck-scoped due queries |
| `LearningProfile.js` (`LearningProfile`) | Active | `userId: 1` (unique) | Missing `{xp: -1}` index for leaderboard sorting/rebuilding |
| `Lesson.js` (`Lesson`) | Active | Default `_id` only | Seeded by `seeders/standardLessons.js`; missing `{level:1, isPreSeeded:1}` |
| `Subscription.js` (`Subscription`) | Dormant | `userId: 1` (unique) | Queried only in unmounted `FeatureFlagService`; no routes create/update subscriptions |
| `Leaderboard.js` (`Leaderboard`) | **Orphaned** | `{period:1, periodKey:1, xpEarned:-1}` | Never read or written anywhere; missing unique `{userId:1, period:1, periodKey:1}` |
| `ActivityFeed.js` (`ActivityFeed`) | **Orphaned** | Default `_id` only | Never read or written anywhere |
| `Classroom.js` (`Classroom`) | **Orphaned** | `joinCode: 1` (unique) | Never read or written anywhere; missing `{teacherId:1}`, `{students:1}` |
| `Assignment.js` (`Assignment`) | **Orphaned** | Default `_id` only | Never read or written anywhere |
| `CommunityDeck.js` (`CommunityDeck`) | **Orphaned** | Default `_id` only | Never read or written anywhere |
| `ForumPost.js` (`ForumPost`) | **Orphaned** | Default `_id` only | Never read or written anywhere |
| `Quiz.js` (`Quiz`) | **Orphaned** | Default `_id` only | `QuizEngine.generateQuiz` returns raw Gemini JSON without persisting to `Quiz` |

---

## 2. Authentication Flow

1. **Token Issuance (`controller/auth.js`):**
   - `signup` and `login` sign a JWT containing `{ userId: user._id }` using `process.env.JWT_SECRET_KEY` with `expiresIn: "7d"`.
   - Set via cookie `res.cookie("jwt", token, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" })`.
2. **Verification (`middleware/auth.js` - `protectRoute`):**
   - Reads `req.cookies?.jwt` first, falling back to `Authorization: Bearer <token>`.
   - Verifies with `jwt.verify(token, process.env.JWT_SECRET_KEY)` and loads `User.findById(decoded.userId).select("-password")` on every request.
3. **Auth Flaws Identified:**
   - **Wrong HTTP status on invalid/expired JWT:** `protectRoute` catches `jwt.verify` exceptions (`TokenExpiredError`, `JsonWebTokenError`) and returns `500 Internal Server Error` instead of `401 Unauthorized` (`middleware/auth.js:29-32`).
   - **Password hash leakage:** `User.model.js` does not set `select: false` on `password`. Consequently, `POST /api/auth/signup`, `POST /api/auth/login`, and `GET /api/users` (`getRecommendedUsers`) serialize bcrypt password hashes directly to clients.
   - **PII / user-object log spam:** `protectRoute` runs `console.log("Authenticated User:", user)` on every authenticated API request (`middleware/auth.js:27`).
   - **Dead `localStorage` token references on frontend:** `frontend/src/lib/api.js` (`sendFriendRequest`, `acceptFriendRequest`) sends `Authorization: Bearer ${localStorage.getItem("token")}` (`Bearer null`), relying accidentally on `withCredentials: true` cookies instead. `AISidebar.jsx:35` opens `new EventSource("http://localhost:5001/api/ai/stream-explain?...")` without `withCredentials: true`, which fails cookie auth cross-origin in dev and points to `localhost` in production.
   - **Broken post-login toast:** `frontend/src/hooks/useLogin.js:10` calls `toast.success(...)` without importing `toast`, throwing `ReferenceError: toast is not defined` inside `onSuccess` before `queryClient.invalidateQueries({ queryKey: ['authUser'] })` can execute.

---

## 3. Role-Based Access Control (RBAC)

- **Schema support:** `User.model.js` defines `role` (`"USER" | "PREMIUM" | "TEACHER" | "ADMIN"`, default `"USER"`), and `Subscription.js` defines `tier` (`"FREE" | "PREMIUM" | "PRO"`, default `"FREE"`).
- **Actual enforcement:** **None.**
  - There is **zero RBAC middleware** on the backend (no `authorizeRoles` or tier check middleware exists).
  - No backend routes exist for classrooms, assignments, subscriptions, or admin operations.
  - On the frontend, `Sidebar.jsx:85` bypasses its own role check with `|| true`:
    ```jsx
    {(authUser?.role === 'TEACHER' || authUser?.role === 'ADMIN' || true) && ( ... )}
    ```
  - `App.jsx:100-109` renders `/teacher` and `/teacher/:id` for any authenticated, onboarded user regardless of `role`.
  - Tier representation is split inconsistently between `User.role === "PREMIUM"` (`SettingsPage.jsx:180`) and `Subscription.tier` (`FeatureFlagService.js:34`).

---

## 4. Stream Video & Chat Token Issuance

- `backend/src/lib/stream.js` initializes a server-side `StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET)` client.
- On `signup` and `onboarding`, `upsertStreamUser({ id, name, image })` syncs the MongoDB user into Stream.
- `GET /api/chat/token` (`protectRoute` -> `getStreamToken`) calls `streamClient.createToken(userIdStr)` and returns `{ token }`.
- **Issues:**
  - `streamClient.createToken(userIdStr)` is called **without an expiration timestamp (`exp`)**, issuing non-expiring Stream tokens.
  - `generateStreamToken` swallows errors (`console.error`) and returns `undefined`, causing `GET /api/chat/token` to respond `200 OK` with `{}` when `STREAM_API_SECRET` is missing or invalid.
  - `Callpage.jsx:37` logs the live Stream token to the browser console (`console.log("Initializing call with token:", tokenData.token)`), and line 35 (`if (!tokenData.token ...)`) throws a `TypeError` when `tokenData` is still `undefined` on initial render.

---

## 5. Gemini API Endpoints

All AI calls flow through `GeminiAdapter` (`backend/src/services/ai/GeminiAdapter.js`) using `@google/generative-ai` with model `gemini-2.5-flash` (`temperature: 0.7`). A new `GoogleGenerativeAI` + `GeminiAdapter` instance is constructed on every call via `getAIProvider()`.

| Endpoint | Service Method | Prompt / Behavior | Issues |
|---|---|---|---|
| `POST /api/ai/grammar` | `GrammarService.check(message, targetLanguage)` | JSON grammar check (`hasErrors`, `original`, `improved`, `explanation`) | No input validation, no rate limit, no cache, no timeout/retry |
| `POST /api/ai/vocabulary` | `VocabularyService.suggest(message, targetLanguage)` | 3 native vocabulary suggestions as JSON | Same as above |
| `POST /api/ai/translate` | `TranslationService.translate(message, sourceLanguage, targetLanguage)` | JSON `literal`, `natural`, `nuanceExplanation` | Same as above |
| `POST /api/ai/analyze` | `AnalyzerService.analyzeConversation(chatTranscript, targetLanguage)` | Conversation evaluation JSON (`cefrEstimate`, `fluencyScore`, etc.) | Unbounded `chatTranscript` size, no rate limit, no timeout |
| `GET /api/ai/stream-explain` | `ai.streamExplanation` (`provider.generateStream`) | SSE stream explaining cultural nuance/tone | Hardcoded `localhost:5001` in `AISidebar.jsx`, no rate limit |
| `POST /api/ai/roleplay/turn` | `RoleplayService.processTurn(userId, history, targetLanguage, cefrLevel)` | Multi-turn roleplay continuation | Does not use `asyncHandler`; frontend `playRoleplayTurn` never sends `scenario`, `targetLanguage`, or `cefrLevel` (always defaults to `'English'` / `'Intermediate'`) |
| `POST /api/learning/quiz` | `QuizEngine.generateQuiz(topic, targetLanguage)` | 3-question MCQ JSON quiz | Hardcoded topic `'Present Simple vs Present Continuous'` & `'English'` in `LearningDashboard.jsx:34`; not cached or persisted |

**PromptBuilder bug (`services/ai/PromptBuilder.js:38`):** Uses `template.buildUserPrompt(...Object.values(params))`, relying on object key insertion order instead of named destructuring.

---

## 6. How XP, Leaderboard, Online Status & Activity Feed Work Today

1. **XP & Streaks (`AnalyticsEngine.js`):**
   - Stored in `LearningProfile` (`xp`, `currentStreak`, `longestStreak`, `lastActiveDate`).
   - Updated only when the client calls `POST /api/learning/xp` with `{ amount }` (triggered on frontend when finishing a `LessonViewer` (+25) or `QuizUI` (+50)).
   - **Flaws:**
     - **Client-controlled XP:** Any logged-in user can `POST /api/learning/xp` with `{ "amount": 1000000 }` or negative numbers.
     - **Broken streak math:** `Math.floor(Math.abs(now - lastActive) / 86400000)` measures 24-hour elapsed intervals instead of calendar days; practicing at 10 PM Day 1 and 9 AM Day 2 yields `diffDays === 0`, failing to increment `currentStreak`.
     - **First-load race condition:** `useLearningStore.fetchLearningData()` fires `GET /api/learning/profile` and `GET /api/learning/roadmap` concurrently via `Promise.all`; both call `AnalyticsEngine.getProfile()`, which does find-then-create on `LearningProfile` (`userId` unique), causing a duplicate-key `E11000` 500 error for brand-new users.
2. **Leaderboard:**
   - **Completely mocked on the frontend (`LeaderboardPage.jsx`).** Displays 5 hardcoded users (`Yuki`, `Sarah Connor`, etc.) and hardcodes the logged-in user at rank `#42` with `1,200 XP`.
   - `models/Leaderboard.js` is never written to by `AnalyticsEngine.awardXP`, and no `/api/leaderboard` endpoint exists on the backend.
3. **Online Status (Presence):**
   - **Not implemented.** `FriendsPage.jsx` uses a hardcoded 3-element React `useState` array with static `'online'` / `'offline'` strings. `Homepage.jsx` (`FriendCard.jsx`) renders real friends from `/api/users/friends` without any online indicator.
   - `User.model.js` stores `privacy.showOnlineStatus`, whereas `SettingsPage.jsx:13` reads `authUser?.privacySettings?.showOnlineStatus` (field-name mismatch) and `handleSavePrivacy` only runs a fake 800ms `setTimeout`.
4. **Activity Feed:**
   - **Completely mocked on the frontend (`components/ActivityFeed.jsx`).** Displays 4 static items (`Sarah`, `Yuki`, `Alex`, `Maria`).
   - `models/ActivityFeed.js` is never written to or queried anywhere on the backend.

---

## 7. Security, Performance & Correctness Issues Summary

### Security & Secrets
- **No hardcoded credentials in source files** (secrets live in `.env`, which is gitignored), **but**:
  - `User.password` bcrypt hashes are leaked in `signup`, `login`, and `getRecommendedUsers` responses.
  - **ReDoS / Regex Injection:** `controller/user.js:22-35` passes raw `req.query` strings (`location`, `search`, `nativeLanguage`, `learningLanguage`) directly into `new RegExp(...)`. Sending `?search=([a-z]+)+$` or invalid regex syntax (`?search=[`) either stalls the event loop or throws an unhandled `SyntaxError` (500).
  - **Mass Assignment:** `PUT /api/flashcards/:id` (`controller/flashcards.js:46-57`) passes `req.body` directly into `findOneAndUpdate`, allowing overwrites of `userId`, `deckId`, `reviewCount`, `correctCount`, and `wrongCount`.
  - **Missing HTTP hardening:** No `helmet` headers, no `express.json({ limit })` request body cap, single-origin CORS config without multi-origin allow-list support, and no `/health` check endpoint.
  - **Sensitive logging:** Full `req.user` logged on every request (`middleware/auth.js:27`); Stream token logged in `Callpage.jsx:37`.

### Missing Input Validation
- Zero schema validation (`zod`/`joi`) across all write endpoints (`auth`, `decks`, `flashcards`, `review`, `ai`, `learning`, `users`).
- Invalid MongoDB `:id` route parameters throw unhandled Mongoose `CastError` -> `500 Internal Server Error` instead of `400 Bad Request`.

### Unpaginated Queries & Missing Indexes
- `GET /api/users` (`getRecommendedUsers`): Unbounded `User.find(query)` returning full documents; lacks compound index `{ isOnboarded: 1, nativeLanguage: 1, learningLanguage: 1 }`.
- `GET /api/decks/:id`: Unbounded `Flashcard.find({ deckId })`; lacks `{ deckId: 1, createdAt: -1 }`.
- `GET /api/review/due`: Uses `{ userId: 1, nextReviewDate: 1 }`, missing `{ userId: 1, deckId: 1, nextReviewDate: 1 }` when `deckId` is supplied.
- `GET /api/learning/roadmap`: Queries `Lesson.find({ level, isPreSeeded: true })` with zero indexes on `Lesson`.
- `ActivityFeed`, `Classroom`, `Assignment`, `LearningProfile` (`{ xp: -1 }`), and `Leaderboard` (`{ userId: 1, period: 1, periodKey: 1 }` unique) all lack production indexes for feed, roster, and ranking queries.

### Frontend Routing & Dependency Bugs
- **Unreachable Flashcard Pages:** `DeckDetailsPage.jsx` (`/flashcards/deck/:id`) and `ReviewPage.jsx` (`/review` and `/review/:id`) exist in `frontend/src/pages/` and are linked from `FlashcardsPage.jsx`, **but are not registered in `frontend/src/App.jsx`**, making flashcard deck management and SRS study sessions unreachable!
- **Inverted Production Static Check:** `backend/src/server.js:42` has `if (process.env.NODE_ENV !== "production")` instead of serving the built SPA in production.
- **Undeclared & Circular Dependencies:** `frontend/package.json` uses `axios` without declaring it in `dependencies`, and both `backend/package.json` and `frontend/package.json` declare `"duffy2": "file:.."`.
- **Broken Favicon Path:** `frontend/index.html:5` points to `/frontend/public/duffylogo.svg` instead of `/duffylogo.svg`.
- **Dead API Helper:** `frontend/src/lib/api.js:8` (`startLesson` -> `POST /learning/lesson/start`) points to a route that does not exist.

---

## 8. README vs. Codebase Discrepancies

| README Claim | Actual Codebase Reality |
|---|---|
| `git clone https://github.com/yourusername/duffy.git` | Placeholder URL; real repo is `https://github.com/Slash-495/Duffy.git`. |
| *"Create a .env file with your MongoDB URI, JWT Secret, and Gemini API Key"* | Omits required `STREAM_API_KEY`, `STREAM_API_SECRET`, `CLIENT_URL` (backend) and `VITE_STREAM_API_KEY` (frontend); no `.env.example` files exist. |
| *"evolved into a massive, production-ready application"* | Marketing filler; Leaderboard, Activity Feed, Friends Page, Teacher Hub, Classroom View, AI Coach, Settings persistence, and Premium upgrades are static frontend mocks. |
| *"AI Grammar Coach: Instantly check your grammar, get context-aware translations, and receive natural phrasing suggestions powered by Gemini AI"* | Backend routes (`/api/ai/grammar`, `/vocabulary`, `/translate`) exist, but `/ai-coach` (`AICoach.jsx`) uses hardcoded `setTimeout` strings and `AISidebar.jsx` leaves the Correct/Vocab/Translate tabs unwired. |
| *"Immersive AI Roleplay ... dynamically adapt to your proficiency level"* | `RoleplaySession.jsx` only sends `history` to `POST /api/ai/roleplay/turn`, omitting scenario context, target language, and user CEFR level (backend defaults every session to `'English'` / `'Intermediate'`). |
| *"Real-Time Voice Analysis ... Dynamic Pronunciation Dashboard"* (and UI label *"Powered by Deepgram AI"*) | Uses browser `WebSpeechAPI` (`SpeechRecognition`) for transcription, then generates random scores (`70–89%` / `80–94%`) and appends `"aw"` to a random word in client-side JS. No Deepgram or acoustic model is connected. |
| *"Leaderboard & XP System: Compete globally. Earn points by completing lessons, adding flashcards, or chatting with the AI"* | `LeaderboardPage.jsx` is 100% hardcoded mock data (`#42`); no `/api/leaderboard` endpoint exists; adding flashcards and chatting do not award XP. |
| *"Friends Hub: Send, accept, and decline friend requests. View online status, see mutual languages, and easily challenge friends"* | `/friends` (`FriendsPage.jsx`) uses local mock arrays, decline endpoint does not exist, online status is not tracked, and the Challenge button is a no-op (only `Homepage.jsx` and `Notificationspage.jsx` hit real friend endpoints). |
| *"Activity Feed: A real-time timeline showcasing major milestones"* | `ActivityFeed.jsx` renders 4 hardcoded items; `ActivityFeed` model is unused. |
| *"Teacher Hub ... Generate 6-digit joinCodes ... Monitor deep-dive roster analytics ... RBAC protecting Premium and Admin routes"* | `TeacherDashboard.jsx` and `ClassroomView.jsx` are local state mocks; `Sidebar.jsx` has `|| true`; zero RBAC middleware or classroom routes exist on the backend. |
| *"Granular Settings ... privacy toggles (e.g., hide online status, hide activity feed), and billing"* | `SettingsPage.jsx` Save buttons do not call any API (`setTimeout` mock) and reference `privacySettings` instead of `User.privacy`. |

---

## 9. Phase 1 Redis Design Reasoning: What Fits vs. What Is Skipped

### Included (Solves a Concrete Bottleneck)

1. **Leaderboard via Redis Sorted Sets (`ZINCRBY`, `ZREVRANGE`, `ZREVRANK`, `ZSCORE`)**
   - *Problem:* Computing global and weekly/daily rankings + an arbitrary user's exact rank in MongoDB requires sorting or counting across `LearningProfile` / `Leaderboard` documents on every page view ($O(N)$ count for rank).
   - *Redis Fit:* Sorted sets (`leaderboard:alltime`, `leaderboard:weekly:<YYYY-Www>`, `leaderboard:daily:<YYYY-MM-DD>`) update atomically on XP changes in $O(\log N)$ via `ZINCRBY` and fetch top-$K$ slices (`ZREVRANGE ... WITHSCORES`) plus exact 0-based caller rank (`ZREVRANK`) in $O(\log N + K)$. MongoDB (`LearningProfile` + `Leaderboard`) remains the durable source of truth, backed by a rebuild script (`backend/src/scripts/rebuildLeaderboard.js`) and automatic MongoDB fallback if Redis is down.

2. **Tier-Aware Per-User Rate Limiting on Gemini Endpoints**
   - *Problem:* Every Gemini endpoint (`grammar`, `vocabulary`, `translate`, `analyze`, `stream-explain`, `roleplay/turn`, `learning/quiz`) is currently unthrottled; a single user or script can exhaust API quotas. In-memory limiters reset on deploy/restart, don't share state across instances, and key by IP rather than authenticated user + subscription tier.
   - *Redis Fit:* A sliding-window / fixed-window atomic Redis counter (`ratelimit:ai:<userId>:<window>`) keyed by `req.user._id` enforces tier-based quotas (`FREE` < `PREMIUM` < `PRO`, resolving tier from `Subscription` / `User.role`), sets `X-RateLimit-*` and `Retry-After` headers on `429 Too Many Requests`, and degrades gracefully (in-memory fallback) if Redis is unreachable.

3. **Cache-Aside with TTL for Repeatable Gemini Prompts & Hot Reads**
   - *Problem:* Learners frequently submit identical short phrases, translations, vocabulary lookups, and standard topic quizzes (`500ms–2,500ms` per Gemini round-trip), and `GET /api/learning/roadmap` / `GET /api/decks` repeatedly query unchanged data.
   - *Redis Fit:* Deterministic SHA-256 cache keys (`cache:ai:<task>:<sha256(normalizedPayload)>`, TTL 24h) turn repeat AI queries into ~1ms hits without burning tokens. User-scoped hot-read caches (`cache:decks:<userId>`, `cache:roadmap:<cefrLevel>`, TTL 5–15m) cut MongoDB read load and explicitly invalidate on deck/flashcard mutations. (Conversational `roleplay/turn` and `analyze` with unique multi-turn transcripts are intentionally **not** cached because repeat hit rates are near zero.)

4. **Online Presence via Ephemeral TTL Keys (`presence:user:<userId>`)**
   - *Problem:* Writing 30–60s presence heartbeats to MongoDB `users` documents causes heavy write amplification and index churn, and requires background cron sweeps to mark disconnected users offline.
   - *Redis Fit:* `SET presence:user:<userId> <timestamp> EX 90` refreshed by a lightweight heartbeat endpoint (`POST /api/users/presence/heartbeat`) expires automatically when a user closes the app. Friends endpoints batch-check presence in a single round-trip via `MGET`, strictly masking any user where `privacy.showOnlineStatus === false`.

### Explicitly Skipped (Would Be Over-Engineering)

1. **Redis Session Store / JWT Blacklist:** Authentication already uses short-payload `httpOnly` JWT cookies. Introducing stateful Redis session lookups on every request adds latency and a Redis availability dependency to auth without solving an active problem in this architecture.
2. **Redis Pub/Sub / Streams for Chat or Live Feed Push:** Stream (`getstream.io`) already handles WebSocket chat and video signaling. Running a parallel Socket.IO + Redis Pub/Sub broker just to push occasional activity feed badges would duplicate real-time infrastructure for low-frequency events that cursor-paginated REST fetches handle cleanly.
3. **Caching SRS Due Cards (`GET /api/review/due`):** Due-card eligibility depends on wall-clock `nextReviewDate <= now` and mutates after every card grade (`POST /api/review/:id`), resulting in constant invalidation and negligible hit rates. A compound MongoDB index (`{ userId: 1, deckId: 1, nextReviewDate: 1 }`) is the right tool.
4. **Distributed Locks (Redlock):** XP updates (`$inc` + `ZINCRBY`) and friend-request creation (unique compound index `{ sender: 1, recipient: 1 }`) are naturally atomic at the single-document/key level; distributed locks would add unnecessary failure modes.
