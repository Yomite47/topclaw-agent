FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install PM2 globally
RUN npm install pm2 -g

# Copy all agent files
COPY . .

# Expose dashboard port
EXPOSE 3000

# Start the agents with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
