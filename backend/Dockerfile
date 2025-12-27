# Use Node.js LTS
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (use npm install since no lock file)
RUN npm install --only=production

# Copy app source (only server.js, not the api folder)
COPY server.js ./

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
