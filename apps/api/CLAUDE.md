# API Package — apps/api
See root CLAUDE.md for full domain context and rules.

## Stack
NestJS + TypeScript + Prisma + PostgreSQL
Port: 3000

## Module pattern
src/modules/{name}/
  {name}.module.ts
  {name}.controller.ts   → @UseGuards(TenantGuard, RbacGuard)
  {name}.service.ts
  dto/create-{name}.dto.ts
  dto/update-{name}.dto.ts
  entities/{name}.entity.ts

## Commands
pnpm --filter api dev          → start dev (port 3000)
pnpm --filter api build        → production build
pnpm --filter api test         → run tests
pnpm --filter api db:migrate   → prisma migrate dev
pnpm --filter api db:studio    → prisma studio
