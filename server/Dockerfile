FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src/
RUN npm install -D typescript && npx tsc

# ─── Production Stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup -S nimiq && adduser -S nimiq -G nimiq

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Install curl for health checks
RUN apk add --no-cache curl

RUN chown -R nimiq:nimiq /app
USER nimiq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
