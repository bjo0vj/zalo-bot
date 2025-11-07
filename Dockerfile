# --- Dùng Node 20 trên Debian Bullseye ---
FROM node:20-bullseye

# Thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và cài dependencies
COPY package*.json ./

# Cài các lib hệ thống Chromium cần để chạy (tránh lỗi “Missing dependency”)
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

# Cài các thư viện Node.js (bao gồm Puppeteer-Core, Chromium, Express)
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Tạo thư mục lưu cache trình duyệt (để không lỗi “no space”)
RUN mkdir -p /app/chrome-profile

# Railway yêu cầu process phải mở port => Express handle port này
ENV PORT=3000
EXPOSE 3000

# Chạy bot
CMD ["npm", "start"]
