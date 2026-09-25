# FROM node:20-bookworm-slim

# # Install Tesseract OCR
# RUN apt-get update \
#     && apt-get install -y --no-install-recommends \
#        tesseract-ocr \
#        tesseract-ocr-eng \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy package files first
# COPY package*.json ./

# # Install Node dependencies
# RUN npm install

# # Copy backend source code
# COPY . .

# # Render provides PORT automatically
# EXPOSE 5000

# CMD ["npm", "start"]













































FROM node:20-bookworm-slim

# Install Tesseract OCR and English language data
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr \
       tesseract-ocr-eng \
    && echo "===== TESSERACT CHECK =====" \
    && tesseract --version \
    && which tesseract \
    && echo "===== TESSERACT CHECK COMPLETE =====" \
    && rm -rf /var/lib/apt/lists/*

# Backend working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy backend source code
COPY . .

# Render provides the PORT environment variable
EXPOSE 5000

# Start the Express server
CMD ["npm", "start"]