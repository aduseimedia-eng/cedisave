FROM node:18-slim

WORKDIR /app

# Copy backend package files
COPY backend/package.json ./

# Install dependencies
RUN npm install --only=production

# Copy backend source code
COPY backend/ .

# Expose port
EXPOSE ${PORT:-5000}

# Start server
CMD ["node", "server.js"]
