FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw CLI globally
RUN npm install -g openclaw

# Set working directory
WORKDIR /app

# Copy agent files
COPY . .

# Expose gateway port (default 3000)
EXPOSE 3000

# Start the agent gateway
CMD ["openclaw", "gateway", "--host", "0.0.0.0"]
