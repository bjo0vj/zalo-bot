FROM node:20-bullseye

# Cài Chromium dependencies đầy đủ cho Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libstdc++6 \
    lsb-release \
    wget \
    xdg-utils \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxshmfence1 \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài dependencies Node
COPY package*.json ./
RUN npm ci --production
COPY . .

# Folder lưu session Zalo
RUN mkdir -p /data/chrome-profile
ENV USER_DATA_DIR=/data/chrome-profile

CMD ["node","zalo-bot.js"]
