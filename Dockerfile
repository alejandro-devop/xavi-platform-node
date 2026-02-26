# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init and postgresql-client for migrations
RUN apk add --no-cache dumb-init postgresql-client

# Copy package files first
COPY package*.json ./

# Install ONLY production dependencies (but keep tsx for migrations)
RUN npm ci --only=production && npm cache clean --force

# Install tsx for running migrations
RUN npm install tsx

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy migration scripts and files
COPY migrations ./migrations
COPY scripts/migrate.ts ./scripts/
COPY scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x scripts/docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port (Cloud Run will override this)
EXPOSE 8080

# Use entrypoint script to run migrations before starting
ENTRYPOINT ["dumb-init", "--", "./scripts/docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/server.js"]
