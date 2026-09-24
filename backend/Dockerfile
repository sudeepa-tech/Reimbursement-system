# ReimbursePro Backend - Production Dockerfile
FROM node:18-slim

# Install system Tesseract OCR (used for image receipt extraction)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads db

ENV NODE_ENV=production
EXPOSE 5000

# Seed the database on first boot if empty (server.js already handles this),
# then start the API.
CMD ["node", "server.js"]
