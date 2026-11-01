# syntax=docker/dockerfile:1

# Stage 1: Build the Frontend SPA
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Copy frontend dependency manifests
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source files
COPY frontend/ ./

# Build production SPA assets to frontend/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Express Backend & SPA Host
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install curl for Docker health check
RUN apk add --no-cache curl

# Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Setup backend working directory
WORKDIR /app/backend

# Copy backend package manifests
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend source
COPY backend/src ./src

# Copy built frontend distribution from builder stage to /app/frontend/dist
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

# Set permissions for non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose default HTTP port
EXPOSE 5001

# Production environment variables
ENV NODE_ENV=production \
    PORT=5001

# Container health check against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
