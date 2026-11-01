# Duffy Security Architecture & Hardening Guide

This document details the security posture, authentication architecture, access control, rate limiting, and known limitations of the Duffy application.

---

## 1. Authentication & Session Management

- **Format**: Signed JSON Web Tokens (`jsonwebtoken`, HS256 algorithm).
- **Secret Hygiene**: Signed with `JWT_SECRET_KEY` (minimum 32 high-entropy characters required in production).
- **Transport & Storage**:
  - Delivered via an `HttpOnly`, `SameSite=Strict` cookie (`jwt`).
  - Marked `secure: true` in production environments (`NODE_ENV === "production"`).
  - Client-side JavaScript cannot read or extract the token via `document.cookie` (mitigating XSS token theft).
- **Session Duration**: Tokens carry a 7-day lifespan (`expiresIn: "7d"`).
- **Token Verification & Lifecycle**:
  - Middleware [`backend/src/middleware/auth.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/middleware/auth.js) validates the cookie (or fallback `Authorization: Bearer <token>` header) on every protected request.
  - User records are retrieved using `User.findById(decoded.userId).select("-password")`.

### Known Authentication Limitations
1. **No Refresh Token Flow**: The architecture uses direct 7-day access cookies without a rotating short-lived access/refresh token pair.
2. **No Centralized Revocation / Blacklist**: JWTs remain cryptographically valid until expiration unless the signing key is rotated. Logging out clears the client cookie and deletes the Redis presence key, but does not add the token identifier (`jti`) to a centralized Redis revocation blocklist.
3. **Password Resets**: Automated self-service email-based password reset flows are not yet implemented; credential recovery requires administrator assistance.

---

## 2. Authorization & Role-Based Access Control (RBAC)

Duffy defines two core roles:
- `USER`: Standard language learner.
- `TEACHER`: Educator with rights to create classrooms, review assigned student rosters, and assign tasks.
- `ADMIN`: Platform administrator with global read/write access.

### Route Guard Middleware
- [`protectRoute`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/middleware/auth.js): Ensures the caller presents a valid JWT and attaches the Mongoose user document to `req.user`.
- [`authorizeRoles(...roles)`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/middleware/auth.js): Enforces that `req.user.role` matches the permissible whitelist (e.g. `authorizeRoles("TEACHER", "ADMIN")` on `POST /api/classrooms`).

### Resource Ownership Checks
- **Flashcards & Decks**: Every CRUD operation checks `{ _id, userId: req.user.id }` (e.g., [`backend/src/controller/decks.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/controller/decks.js) and [`backend/src/controller/flashcards.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/controller/flashcards.js)). Unauthorized access attempts return 404 Not Found to prevent resource enumeration.
- **Classroom Rosters**: [`getClassroomById`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/controller/classroom.js) verifies that non-admin callers strictly match `classroom.teacherId.toString() === req.user._id.toString()`, throwing a 403 Forbidden on violation.

---

## 3. Rate Limiting & Abuse Prevention

Duffy implements multi-layered rate limiting in [`backend/src/middleware/rateLimiter.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/middleware/rateLimiter.js):

1. **Global Public API Limiter (`apiLimiter`)**:
   - IP-based rate limiting via `express-rate-limit`.
   - Defaults to 200 requests per 15-minute window (`API_RATE_LIMIT_MAX`).
   - Exempts `/health` and `/api/health` endpoints for orchestrator uptime probes.
2. **Authentication Limiter (`authLimiter`)**:
   - Restricts `/api/auth/signup` and `/api/auth/login` to 30 requests per 15-minute window per IP to prevent automated brute-force attacks.
3. **Tier-Aware Sliding-Window AI Limiter (`createTierRateLimiter`)**:
   - Enforces per-user rolling limits on LLM calls:
     - `FREE`: 10 calls per 15-minute window.
     - `PREMIUM`: 60 calls per 15-minute window.
     - `PRO`: 300 calls per 15-minute window.
   - **Primary Engine**: Atomic sliding-window Redis Lua script using Sorted Sets (`ZREMRANGEBYSCORE`, `ZCARD`, `ZADD`, `PEXPIRE`).
   - **Graceful Fallback**: If Redis is unconfigured or unreachable, falls back immediately to an in-memory sliding-window store with automated cutoff pruning.
   - **Headers**: Returns `X-RateLimit-Tier`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`, and `X-RateLimit-Reset` upon rejection (HTTP 429).

---

## 4. Input Validation & Data Normalization

- **Zod Schema Validation**: All request bodies on state-changing endpoints pass through [`validateBody`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/middleware/validate.js) against schemas defined in [`backend/src/validators/schemas.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/validators/schemas.js).
- **ObjectId Validation**: URL parameters (`:id`) pass through `validateObjectIdParam` to prevent Mongoose `CastError` 500 crashes on malformed inputs.
- **Payload Limits**: Express JSON and URL-encoded parsers strictly enforce a `100kb` maximum payload size to eliminate body-size DoS vectors.

### Email Normalization & Duplicate Account Prevention
- **Normalization**: Email addresses are sanitized with `.trim().toLowerCase()` in both `signupSchema` and `loginSchema`, as well as on the Mongoose `User` schema (`lowercase: true, trim: true`).
- **Guarantee**: Requests for `User@Example.com` and `user@example.com` are normalized before database queries, preventing duplicate account creation or login ambiguity.

### Note on Historical Data Migrations
- The MongoDB `User` collection enforces a unique index on `email: 1`.
- If an existing database contains historical accounts created before schema normalization with uppercase or whitespace-padded emails, attempting to create matching lowercase variants will result in index collisions.
- **Migration Script (Manual)**: When migrating existing databases, run a one-time script to inspect and normalize historical emails:
  ```javascript
  // Example one-time migration query:
  db.users.find().forEach(function(u) {
    db.users.updateOne(
      { _id: u._id },
      { $set: { email: u.email.trim().toLowerCase() } }
    );
  });
  ```

---

## 5. Content Security Policy (CSP)

Duffy uses **Helmet 8** to inject security headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Strict-Transport-Security`.

### Report-Only Policy
Helmet is configured in [`backend/src/server.js`](file:///c:/Users/arush/OneDrive/Desktop/Duffy2/backend/src/server.js) with `Content-Security-Policy-Report-Only`:
```javascript
helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://avatar.iran.liara.run",
        "https://*.stream-io-api.com",
        "https://*.stream-io-video.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.stream-io-api.com",
        "wss://*.stream-io-api.com",
        "https://*.stream-io-video.com",
        "wss://*.stream-io-video.com",
        "https://*.getstream.io",
      ],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
})
```

### Whitelisted External Origins
- **Stream**: Chat API (`https://*.stream-io-api.com`), WebSockets (`wss://*.stream-io-api.com`, `wss://*.stream-io-video.com`), and WebRTC signaling.
- **Iran Liara**: Random avatar generator (`https://avatar.iran.liara.run`).
- **Google Fonts**: Web fonts stylesheet and font binary origins (`fonts.googleapis.com`, `fonts.gstatic.com`).

### How to Flip to Enforcing Mode
Once the report-only headers have been observed in staging and verified to cause no false-positive violations in the browser console, flip the policy to active enforcement by setting `reportOnly: false` in `backend/src/server.js`:
```javascript
// Change:
reportOnly: false,
```
This converts the outgoing header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

---

## 6. Known Security Limitations & Roadmap

1. **Transcript-Based Pronunciation**: Pronunciation evaluation relies on browser Web Speech API speech-to-text transcripts matched against target words, rather than native acoustic phoneme audio analysis.
2. **Stateless JWTs Without Revocation**: As noted above, session invalidation relies on cookie removal on the client; a compromised token remains valid until expiration.
3. **No Two-Factor Authentication (2FA)**: User accounts currently authenticate via single-factor password credentials.
4. **XP Ledger Event Sourcing**: Leaderboard XP increments are written directly to MongoDB and Redis without a multi-document distributed transaction (eventual consistency reconciled by `npm run rebuild:leaderboard`).
