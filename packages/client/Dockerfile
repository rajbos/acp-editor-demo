FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server and public files
COPY server.js ./
COPY public/ ./public/

EXPOSE 3000

CMD ["npm", "run", "dev"]
