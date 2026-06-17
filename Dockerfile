# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy config and source files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server.ts ./

# Build client and compile backend server
RUN npm run build

# Stage 2: Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set container environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json to run startup script and register packages
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets and compiled server from builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
