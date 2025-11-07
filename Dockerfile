FROM node:20-bullseye

WORKDIR /app

# Copy file package.json và cài đặt thư viện Chromium cần thiết
COPY package*.json ./

# Cài các lib hệ thống mà Puppeteer (Chromium) cần để chạy
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Cài npm package (bỏ --production vì gây lỗi lockfile khi chưa sync)
RUN npm install

# Copy toàn bộ code còn lại
COPY . .

# Tạo thư mục lưu session Zalo
RUN mkdir -p /app/chrome-profile

# Chạy bot
CMD ["node", "zalo-bot.js"]
