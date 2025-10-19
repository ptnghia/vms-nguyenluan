# ============================================================
# Stage 1: Build React Application
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# ============================================================
# Stage 2: Development Environment
# ============================================================
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose ports
EXPOSE 3001

# Start development server
CMD ["npm", "start"]

# ============================================================
# Stage 3: Production with Nginx
# ============================================================
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1000 vms && \
    adduser -D -u 1000 -G vms vms && \
    chown -R vms:vms /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
