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

# Copy all agent files
COPY . .

# Make start script executable
RUN chmod +x start_agent.sh

# Expose dashboard port
EXPOSE 3000

# Start the agents
CMD ["./start_agent.sh"]
