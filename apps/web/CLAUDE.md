# Admin Web — apps/web
See root CLAUDE.md for full domain context and rules.

## Stack
React + Vite + TypeScript + Redux Toolkit + RTK Query
Desktop-first SPA. Port: 5173.

## Feature structure
src/features/{name}/
  {name}Slice.ts   → local UI state
  {name}Api.ts     → RTK Query endpoints
  components/

## Commands
pnpm --filter web dev    → start dev
pnpm --filter web build  → build
