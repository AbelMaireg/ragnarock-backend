FROM node:24-alpine AS builder

RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# prisma.config.ts points schema at libs/prisma/src/schema.prisma — no DB needed for generate
RUN bun run prisma:generate

# Build main (webpack, deleteOutDir clears dist/apps/main only)
RUN bun run build

# Build admin (tsc, outputs to dist/apps/admin — separate outDir, unaffected by above)
RUN bunx nest build admin

# ─────────────────────────────────────────────────────────────────────────────

FROM node:24-alpine

RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# prisma migrate deploy reads prisma.config.ts at runtime to locate schema + migrations
COPY prisma.config.ts ./
COPY libs/prisma/src/schema.prisma ./libs/prisma/src/schema.prisma
COPY libs/prisma/src/migrations ./libs/prisma/src/migrations

COPY docker/staging/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000 3001

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
