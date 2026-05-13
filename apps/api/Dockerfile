FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @pms/shared build
RUN pnpm --filter api db:generate
RUN pnpm --filter api build

FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
