FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Development stage
FROM base AS development
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build && npm prune --production

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy built application and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1000 vms && \
    adduser -D -u 1000 -G vms vms && \
    chown -R vms:vms /app

USER vms

EXPOSE 3000

CMD ["node", "dist/main.js"]
