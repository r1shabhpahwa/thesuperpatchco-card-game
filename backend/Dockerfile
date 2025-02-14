# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy backend source code
COPY . .

# Expose backend port 
EXPOSE 3200

# Start backend server
CMD ["node", "index.js"]
