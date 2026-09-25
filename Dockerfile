FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules if needed
RUN apk add --no-cache python3 make g++

# Copy package configurations
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies
RUN npm run install:all

# Copy source code
COPY . .

# Build client and server bundles
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment configuration
ENV PORT=5000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/mailcal.db

EXPOSE 5000

# Start server
CMD ["node", "server/dist/index.js"]
