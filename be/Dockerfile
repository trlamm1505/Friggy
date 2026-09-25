# ─── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ─── Production stage ───────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Chỉ copy dependencies production
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy prisma CLI từ builder (nằm trong devDeps, cần để chạy migrate deploy)
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy built dist + prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts

# Prisma client generated
COPY --from=builder /app/src/modules-system/prisma/generated ./src/modules-system/prisma/generated

EXPOSE 6969

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
