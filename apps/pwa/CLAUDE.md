# BusManager PWA — apps/pwa
See root CLAUDE.md for full domain context and rules.

## Stack
React + Vite + TypeScript + vite-plugin-pwa + RTK
Mobile-first, offline-first. Port: 5174.

## Critical: offline strategy
Service Worker caches: round data, passenger list, attendance state
Background Sync: queue PATCH /attendance when offline → send on reconnect
IndexedDB: store pending marks locally

## Scope restriction
BusManager sees ONLY own assigned round + bus (enforced by API guard)

## Commands
pnpm --filter pwa dev    → start dev
pnpm --filter pwa build  → PWA build
