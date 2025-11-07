FROM node:20-bullseye

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Thư mục lưu session Zalo
RUN mkdir -p /app/chrome-profile

CMD ["node","zalo-bot.js"]
