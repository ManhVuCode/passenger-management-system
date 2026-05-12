# GR2 — Passenger Management System

## PROJECT IDENTITY
Thesis: "Develop a website for tracking passenger attendance on tourist buses"
Stack: React + Vite + TypeScript · NestJS + Prisma + PostgreSQL · WebSocket/MQTT
Architecture: Multi-tenant SaaS · REST API · Offline-first PWA
Monorepo: pnpm workspaces — apps/api · apps/web · apps/pwa · packages/shared

---

## ⚠️ READ THIS FIRST — WHAT THIS IS (AND IS NOT)

This is NOT a booking app, ticket system, or passenger portal.
This IS an operational passenger management platform for multi-bus, multi-leg tourist trips.
Passengers do NOT login. Passengers have NO accounts. Passengers are data only.

---

## ACTORS

| Actor | Description | Key Permissions |
|-------|-------------|-----------------|
| SystemAdmin | Platform admin | Manage tenants (not primary demo actor) |
| Admin | Trip coordinator | Full CRUD + assign buses/drivers + move passengers + override attendance |
| BusManager | Driver | Mark attendance (own bus only) + update round status (own round only) |
| Passenger | NOT a system user | Trip-scoped data snapshot — no login, no account |

---

## DOMAIN RULES — LOCKED, DO NOT DEVIATE

1. Bus assigns to ROUND (not Trip) → RoundBusAssignment (PK: tripId+roundId+busId)
2. No global Passenger entity → TripPassengerAssignment is the ONLY passenger store
3. Move passenger between buses = Admin ONLY, between rounds ONLY (at stops, never mid-round)
4. 1 BusManager per Bus per Round (BusManagerAssignment, can change between rounds)
5. 1 AttendanceRecord per passenger per round (status: JOIN | ABSENT | CANCELLED)
6. Round CANCELLED → cascade ALL AttendanceRecords to CANCELLED
7. Trip.status is DERIVED from Round statuses (not stored independently)
8. Trip name must NOT contain "/"
9. Bus capacity warning (not block) when over-assigned
10. Tenant isolation: all data tenant-scoped, cross-tenant = HTTP 403

---

## CORE DOMAIN MODEL

Tenant ──< User (role: SYSTEM_ADMIN | ADMIN | BUS_MANAGER)
Tenant ──< Trip ──< Round
Tenant ──< Bus (photoFront, photoSide, photoRear — all required, stored as URL)
Round + Bus → RoundBusAssignment (PK: tripId + roundId + busId)
RoundBusAssignment → BusManagerAssignment (1 driver per bus per round)
Trip → TripPassengerAssignment (snapshot: name, phone, idCard, type?, note?)
TripPassengerAssignment + RoundBusAssignment → RoundPassengerAssignment
RoundPassengerAssignment → AttendanceRecord (1:1)

---

## STATUS FLOWS

Round:      PLANNED → IN_PROGRESS → DONE | CANCELLED (cascade → AttendanceRecords)
Trip:       derived (PLANNED | IN_PROGRESS | DONE | CANCELLED)
Attendance: PENDING(implicit) → JOIN | ABSENT (Admin can override, «extend»)
            Round CANCELLED → all records cascade to CANCELLED

---

## TECH STACK

### Backend — apps/api
- NestJS + TypeScript strict
- Prisma ORM → PostgreSQL 16
- JWT auth (passport-jwt)
- Guards: TenantGuard (global), RbacGuard (@Roles() decorator)
- WebSocket Gateway (MQTTGateway) — topics: trip/{tripId}/attendance, trip/{tripId}/round-status
- Swagger/OpenAPI at /api/docs
- Port: 3000

### Admin Web — apps/web
- React + Vite + TypeScript
- Redux Toolkit (RTK) + RTK Query
- Desktop-first
- Trip date highlight: approaching (≤3 days) amber, active today green
- Port: 5173

### BusManager PWA — apps/pwa
- React + Vite + TypeScript + vite-plugin-pwa
- RTK + RTK Query with offline middleware
- Service Worker (cache round + passenger data)
- Background Sync (queue attendance marks offline)
- Mobile-first, offline-first
- Port: 5174

### Shared — packages/shared
- TypeScript types ONLY (no framework imports)
- All domain interfaces, DTOs, enums

---

## CODING CONVENTIONS

- TypeScript strict mode, no `any`
- NestJS pattern: module / controller / service / dto / entities
- Response format: { data: T, message: string, statusCode: number }
- Type: ApiResponse<T> from packages/shared
- Guards: TenantGuard on every request, RbacGuard per route
- RTK Query: baseApi → feature apis (injectEndpoints)
- Feature folders: src/features/{name}/{name}Slice.ts + {name}Api.ts + components

---

## ENVIRONMENT VARIABLES

apps/api/.env:
  DATABASE_URL="postgresql://dev:devpassword@localhost:5432/passenger_mgmt"
  JWT_SECRET="change-me-in-production"
  JWT_EXPIRES_IN="7d"
  PORT=3000
  MQTT_URL="mqtt://localhost:1883"

apps/web/.env:
  VITE_API_URL="http://localhost:3000"
  VITE_WS_URL="ws://localhost:8083"

apps/pwa/.env:
  VITE_API_URL="http://localhost:3000"
  VITE_WS_URL="ws://localhost:8083"

---

## SHELL COMMANDS — USE RTK FOR TOKEN EFFICIENCY

Always prefer RTK variants:
  git status      → rtk git status
  git log -n 10   → rtk git log -n 10
  git diff        → rtk git diff
  pnpm test       → rtk pnpm test
  find . -name    → rtk find "pattern" .
  grep -r         → rtk grep "pattern" .
  ls -la          → rtk ls .
  cat file.ts     → rtk read file.ts

---

## GIT STRATEGY

Branches:
  main      → keep as-is (old code, do not touch until thesis completion)
  develop   → all new development (current branch)
  sprint/*  → one branch per sprint, merged into develop when done

Commit format: "feat(sprintN): description" or "fix(sprintN): description"

---

## SPRINT ROADMAP

| Sprint | Scope | Status |
|--------|-------|--------|
| 1 | Auth, RBAC, Tenant Isolation | ⬜ TODO |
| 2 | Trip + Round CRUD | ⬜ TODO |
| 3 | Bus management + 3 photos + BusManager assignment | ⬜ TODO |
| 4 | Passenger registration (standalone + Google Sheet sync) | ⬜ TODO |
| 5 | Round passenger allocation + capacity check | ⬜ TODO |
| 6 | Attendance workflow (mark + override + cascade) | ⬜ TODO |
| 7 | Real-time dashboard (WebSocket/MQTT) | ⬜ TODO |
| 8 | Notifications (SMS/Teams/Zalo/Broadcast) | ⬜ TODO |
| 9 | PWA offline-first + testing + deployment prep | ⬜ TODO |

---

## WHAT NOT TO BUILD

- ❌ Passenger login or register
- ❌ Global Passenger table or entity
- ❌ Booking or ticket system
- ❌ Mid-round passenger transfer
- ❌ Auto-sync for Google Sheets (manual trigger only)
- ❌ Voice attendance (optional, deferred)
- ❌ BusManager moving passengers between buses
- ❌ Check-in / Check-out terminology (use JOIN / ABSENT / CANCELLED)
