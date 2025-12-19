# Production Dockerfile for NestJS API
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for building)
RUN npm ci

# Generate Prisma client - use library engine type for cross-platform builds
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLIENT_ENGINE_TYPE=library
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache openssl wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema and migrations
COPY prisma ./prisma/

# Copy Prisma client from builder (avoid running prisma generate under emulation)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy Prisma CLI from builder (needed for migrations in production)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy ts-node, typescript, and related deps from builder (needed for seed scripts)
COPY --from=builder /app/node_modules/ts-node ./node_modules/ts-node
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder /app/node_modules/tsconfig-paths ./node_modules/tsconfig-paths
COPY --from=builder /app/node_modules/@tsconfig ./node_modules/@tsconfig
COPY --from=builder /app/node_modules/arg ./node_modules/arg
COPY --from=builder /app/node_modules/create-require ./node_modules/create-require
COPY --from=builder /app/node_modules/diff ./node_modules/diff
COPY --from=builder /app/node_modules/make-error ./node_modules/make-error
COPY --from=builder /app/node_modules/v8-compile-cache-lib ./node_modules/v8-compile-cache-lib
COPY --from=builder /app/node_modules/yn ./node_modules/yn
COPY --from=builder /app/node_modules/acorn ./node_modules/acorn
COPY --from=builder /app/node_modules/acorn-walk ./node_modules/acorn-walk

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check (health endpoint is excluded from /api prefix)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Start the server (main.js is in dist/ per tsconfig outDir)
CMD ["node", "dist/main"]
