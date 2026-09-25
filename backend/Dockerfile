FROM node:20-bookworm-slim

# Install Tesseract OCR
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr \
       tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy backend source code
COPY . .

# Render provides PORT automatically
EXPOSE 5000

CMD ["npm", "start"]