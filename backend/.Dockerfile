# syntax=docker/dockerfile:1

# ---------- Stage 1：安裝依賴（含編譯 bcrypt 等原生模組所需的工具） ----------
FROM node:20-slim AS deps
WORKDIR /usr/src/app

# bcrypt 是原生模組，若沒有對應平台的 prebuilt binary 會需要從原始碼編譯
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 2：實際運行的容器（乾淨、不含編譯工具） ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /usr/src/app

# 從 deps stage 複製已安裝好的 node_modules，避免在最終 image 裡留下編譯工具
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]