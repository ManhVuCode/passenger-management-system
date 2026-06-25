FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl
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

# openssl provides libssl for the Prisma query engine on Alpine/musl
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

# pnpm stores the generated Prisma client inside node_modules/.pnpm, so the
# old selective "node_modules/.prisma" copy does not exist. Copy the whole
# installed + generated workspace from the builder instead.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api
EXPOSE 3000
# Run pending Prisma migrations in the production environment before starting.
# migrate deploy is idempotent (only applies un-applied migrations) and uses
# DIRECT_URL (port 5432, no pgbouncer) for the migration connection.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node prisma/seed-superadmin.js && node dist/main.js"]
