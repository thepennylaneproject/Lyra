# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json next.config.js ./
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY netlify ./netlify

# Build Next.js application
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache tini

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Metadata
LABEL org.opencontainers.image.title="Lyra Dashboard" \
      org.opencontainers.image.description="Web dashboard for the Lyra code quality platform" \
      org.opencontainers.image.vendor="The Penny Lane Project" \
      org.opencontainers.image.version="1.0.0"
