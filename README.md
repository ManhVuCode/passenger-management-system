# Passenger Management System

Thesis: "Develop a website for tracking passenger attendance on tourist buses"
*(Luận văn: Xây dựng website theo dõi điểm danh hành khách trên xe du lịch)*

**Stack:** NestJS · React · PostgreSQL · Socket.io · PWA
**Tests:** 57 E2E passing across 7 suites
**Sprints:** 1–7 complete · 8–9 planned

---

## 2. What This Is

An **operational passenger management platform** for tourist trips that involve multiple buses and multiple journey legs (rounds). The Admin (trip coordinator) sets up trips, registers passengers, assigns buses and drivers per round, and allocates passengers between buses. BusManagers (drivers) mark JOIN / ABSENT attendance from a mobile-first PWA — Admin sees every mark live on a real-time dashboard.

This is **not** a booking app, not a ticket system, not a passenger-facing portal. Passengers have no account; they are trip-scoped data only. The system is multi-tenant SaaS: each operator manages its own users, trips, buses, and passengers, with hard tenant isolation enforced by guards.

Real-time attendance updates flow through a Socket.io gateway (`/attendance` namespace, JWT-auth on connect, `trip:{tripId}` rooms) so Admin web and peer BusManager PWAs receive marks within a single round-trip.

---

## 3. Architecture Overview

```
┌──────────────────────┐         REST           ┌──────────────────────┐
│  Admin Web (React)   │ ──────────────────────▶│                      │
│  :5173 desktop-first │                        │   NestJS API         │
└──────────────────────┘         WebSocket      │   :3000              │
┌──────────────────────┐ ──────────────────────▶│   Socket.io          │
│  BusManager PWA      │                        │   /attendance        │
│  :5174 mobile/offline│                        │                      │
└──────────────────────┘                        └──────────┬───────────┘
                                                           │ Prisma
                                                           ▼
                                                  ┌────────────────┐
                                                  │  PostgreSQL    │
                                                  │  :5432         │
                                                  └────────────────┘
                                                  ┌────────────────┐
                                                  │  EMQX (MQTT)   │
                                                  │  :1883 :8083   │
                                                  └────────────────┘
```

- **Admin Web** speaks REST + Socket.io to the API.
- **BusManager PWA** speaks REST + Socket.io; Service Worker is scaffolded for offline-first (Sprint 9).
- **EMQX** is provisioned in `docker-compose.yml` for forthcoming MQTT broadcast features (Sprint 8).

---

## 4. Repository Structure

```
passenger-management-system/
├── apps/
│   ├── api/                   # NestJS backend
│   │   ├── prisma/            # Schema, migrations, seed
│   │   ├── src/
│   │   │   ├── auth/          # JWT login + passport strategy
│   │   │   ├── common/        # Guards (Jwt, Roles, Tenant), decorators
│   │   │   ├── gateway/       # Socket.io AttendanceGateway
│   │   │   └── modules/       # trip, round, bus, assignment,
│   │   │                      # passenger, allocation, attendance, me
│   │   └── test/              # 7 E2E suites
│   ├── web/                   # Admin Web App (React + Vite)
│   │   └── src/features/      # auth, trips, buses, passengers,
│   │                          # allocation, dashboard
│   └── pwa/                   # BusManager PWA (React + Vite + vite-plugin-pwa)
│       └── src/features/      # auth, home, attendance
├── packages/
│   └── shared/                # Shared TypeScript types + enums
├── docs/                      # Diagrams (ERD, UC, Activity, Sequence, ...)
├── docker-compose.yml         # PostgreSQL + EMQX
├── pnpm-workspace.yaml
└── CLAUDE.md                  # Project rules, sprint roadmap, conventions
```

---

## 5. Prerequisites

| Tool | Minimum | Recommended |
|------|---------|-------------|
| Node.js | 18 | 22 LTS |
| pnpm | 8 | 10 |
| Docker + Docker Compose | latest | — |
| Git | 2.30+ | — |

> Vietnamese note: máy host cần cài Node, pnpm, Docker; PostgreSQL và EMQX đều chạy bằng Docker — không cần cài thêm.

---

## 6. Quick Start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/ManhVuCode/passenger-management-system
cd passenger-management-system
git checkout develop

# 2. Install all dependencies
pnpm install

# 3. Start Docker services (PostgreSQL + MQTT broker)
docker compose up -d

# 4. Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — see Section 8 for variables

# 5. Run database migrations + seed
pnpm db:migrate
pnpm db:seed

# 6. Start all apps in parallel
pnpm dev
```

Once running:

| App | URL | Description |
|-----|-----|-------------|
| API | http://localhost:3000 | NestJS REST API |
| API Docs | http://localhost:3000/api/docs | Swagger / OpenAPI (planned) |
| Admin Web | http://localhost:5173 | Admin dashboard (desktop) |
| BusManager PWA | http://localhost:5174 | Driver mobile app |
| WebSocket | ws://localhost:3000/attendance | Live attendance broadcast |

---

## 7. Demo Credentials

Seeded by `pnpm db:seed`:

| Role | Email | Password | Tenant |
|------|-------|----------|--------|
| Admin | admin@demo.com | password123 | demo-tours |
| BusManager | driver@demo.com | password123 | demo-tours |
| Admin (cross-tenant) | admin2@other.com | password123 | other-tours |

The cross-tenant admin proves tenant isolation: requesting `demo-tours` resources returns HTTP 403.

---

## 8. Environment Variables

### `apps/api/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://dev:devpassword@localhost:5432/passenger_mgmt` | Prisma connection string |
| `JWT_SECRET` | ✅ | `dev-secret-change-in-production` | JWT signing key |
| `JWT_EXPIRES_IN` | ✅ | `7d` | Token expiry |
| `PORT` | ✅ | `3000` | API port |
| `SMS_API_KEY` | ❌ | — | SMS provider key (Sprint 8 — dev logs only) |
| `TEAMS_WEBHOOK_URL` | ❌ | — | MS Teams incoming webhook (Sprint 8) |
| `BROADCAST_API_KEY` | ❌ | — | Voice broadcast provider (Sprint 8) |

### `apps/web/.env` and `apps/pwa/.env`

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:3000` |
| `VITE_WS_URL` | `ws://localhost:8083` |

---

## 9. Available Scripts

Run from the project root unless noted otherwise:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + Admin Web + PWA in parallel |
| `pnpm build` | Build all packages (`shared` → `api` → `web` → `pwa`) |
| `pnpm test` | Run API E2E test suite |
| `pnpm db:migrate` | Run Prisma migrations against the dev database |
| `pnpm db:seed` | Seed demo tenants, users, and accounts |
| `pnpm db:studio` | Open Prisma Studio (DB GUI on http://localhost:5555) |

Filter-specific commands:

| Command | Description |
|---------|-------------|
| `pnpm --filter api dev` | Start only the API (watch mode) |
| `pnpm --filter web dev` | Start only the Admin Web |
| `pnpm --filter pwa dev` | Start only the BusManager PWA |
| `pnpm --filter api build` | Production build of the API |

---

## 10. Domain Model (Key Rules)

Five non-negotiable rules from `CLAUDE.md` — every feature must respect them:

1. **Bus → Round (not Trip).** A bus is assigned to one round leg via `RoundBusAssignment` (composite key `(tripId, roundId, busId)`). Buses and drivers can change between rounds at a stop.
2. **No global Passenger entity.** Passengers exist only as `TripPassengerAssignment` snapshots scoped to a single trip. No login, no account, no portal.
3. **Move passenger = Admin only.** Only Admins can move a passenger between buses. Movement is allowed only while the round is `PLANNED` — never mid-round.
4. **1 AttendanceRecord per passenger per round.** Status is `JOIN | ABSENT | CANCELLED`. Marking the same passenger again upserts the existing record.
5. **Round `CANCELLED` cascades.** Cancelling a round flips every `AttendanceRecord` in that round to `CANCELLED`. Trip status is **derived** from round statuses — never stored independently.

Two additional invariants worth knowing:

- **Capacity is a warning, not a block.** Allocating more passengers than a bus's `capacity` returns HTTP 201 with a `capacityWarning` field — the Admin decides.
- **Tenant isolation.** Every request is filtered by `tenantId`. Cross-tenant access returns HTTP 403.

---

## 11. API Overview

Selected routes — see Swagger (planned) or controllers under `apps/api/src/modules/` for the full list.

```
Auth
  POST   /auth/login

Trips
  GET    /trips
  POST   /trips
  GET    /trips/:id
  PATCH  /trips/:id

Rounds
  GET    /trips/:tripId/rounds
  POST   /trips/:tripId/rounds
  PATCH  /trips/:tripId/rounds/:id/status

Buses
  GET    /buses
  POST   /buses

Assignment
  POST   /trips/:tripId/rounds/:roundId/buses
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/manager

Passengers
  GET    /trips/:tripId/passengers
  POST   /trips/:tripId/passengers
  POST   /trips/:tripId/passengers/bulk
  POST   /trips/:tripId/passengers/sheet-sync
  GET    /trips/:tripId/passengers/export/csv

Allocation
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/allocations
  PATCH  /trips/:tripId/rounds/:roundId/allocations/:id/move

Attendance
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/attendance
  PATCH  /trips/:tripId/rounds/:roundId/attendance/:id/override
  GET    /trips/:tripId/rounds/:roundId/attendance/summary
  PATCH  /trips/:tripId/rounds/:roundId/note

Me
  GET    /me/assignments        (BusManager: see assigned rounds + bus)

WebSocket
  namespace: /attendance
  client → server: join-trip, leave-trip
  server → client: attendance:updated, round:status-updated
```

Role gating (enforced by `RolesGuard` + `@Roles()` decorator):

| Endpoint group | Admin | BusManager |
|----------------|:-----:|:----------:|
| Trip/Round/Bus/Passenger writes | ✅ | ❌ (403) |
| Allocate / move passenger | ✅ | ❌ (403) |
| Mark attendance | ✅ (any bus) | ✅ (own bus only — else 403) |
| Override attendance | ✅ | ❌ (403) |
| Round operational note | ✅ | ❌ (403) |

---

## 12. Running Tests

```bash
# Full E2E suite (requires Docker services running)
pnpm test

# Watch mode
cd apps/api && pnpm test:watch

# Single suite (Jest 30: --testPathPatterns is plural)
cd apps/api && pnpm test:e2e -- --testPathPatterns=attendance

# Gateway unit test
cd apps/api && npx jest --testPathPatterns=attendance.gateway.spec
```

Current status: **57/57 E2E tests passing** across these 7 suites:

| Suite | Tests | Coverage |
|-------|-------|----------|
| auth.e2e | 6 | Login, JWT, protected routes |
| app.e2e | 1 | Bootstrap smoke |
| trip.e2e | — | Trip CRUD, name validation, derived status |
| bus.e2e | — | Bus CRUD, license-plate uniqueness, photo fields |
| passenger.e2e | — | Passenger CRUD, bulk import, sheet sync, CSV export |
| allocation.e2e | — | Allocate, move, capacity warning, scope guards |
| attendance.e2e | 11 | Mark, scope, override, cascade, summary, note, /me/assignments |

---

## 13. Docker Services

| Service | Image | Ports | Purpose |
|---------|-------|------:|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `emqx` | `emqx/emqx:5.7.0` | 1883, 8083, 18083 | MQTT broker + WS + dashboard |

```bash
docker compose up -d              # start in background
docker compose ps                 # status
docker compose logs -f postgres   # follow logs
docker compose down               # stop (keeps volume)
docker compose down -v            # stop + delete data volume
```

EMQX dashboard is on http://localhost:18083 (user: `admin`, password from `EMQX_DASHBOARD__DEFAULT_PASSWORD` in `docker-compose.yml`).

---

## 14. Project Documentation

All thesis artefacts live in `docs/`:

| File | Description |
|------|-------------|
| `docs/PROJECT_REPORT.md` | Full thesis project report — domain rules, sprint history, design decisions |
| `docs/erd-diagram.html` | Entity Relationship Diagram |
| `docs/uc-diagram.html` | Use Case Diagram |
| `docs/activity_diagram.html` | Activity Diagram |
| `docs/sequence-diagrams.html` | Sequence Diagrams (SD-01, SD-02, SD-03) |
| `docs/state-machine-diagram.html` | State Machine Diagram |
| `docs/deployment-diagram.html` | Deployment Diagram |
| `docs/component-deployment-diagrams.html` | Combined Component + Deployment Diagrams |
| `docs/sprint-1a.md` … `sprint-2.md` | Per-sprint implementation specs |

Open any `.html` file directly in a browser — no build step needed.

`CLAUDE.md` at the repo root holds the locked domain rules, sprint roadmap, coding conventions, and Karpathy guidelines that every contributor must follow.

---

## 15. Sprint Roadmap

| Sprint | Scope | Status |
|--------|-------|--------|
| 1 | Auth, RBAC, Tenant Isolation | ✅ Done |
| 2 | Trip + Round CRUD (with derived status) | ✅ Done |
| 3 | Bus management + 3 mandatory photos + Driver assignment | ✅ Done |
| 4 | Passenger registration + Google Sheet sync (modes A & B) + xlsx export | ✅ Done |
| 5 | Round passenger allocation + capacity warning + Admin-only move | ✅ Done |
| 6 | Attendance workflow — mark, override, cascade, summary, round note | ✅ Done |
| 7 | Real-time WebSocket dashboard (Admin live feed + PWA peer banner) | ✅ Done |
| 8 | Notifications (SMS / Teams / Telegram / Broadcast Call) | ✅ Done |
| 9 | PWA offline-first (Service Worker + Background Sync) · Testing · Deployment | ✅ Done |

---

## 16. Production Deployment

The repository ships a production stack via `docker-compose.prod.yml` — Nginx reverse proxy + NestJS API (Dockerised) + PostgreSQL + EMQX, with healthchecks and restart policies.

### Prerequisites

- Docker + Docker Compose on the target server
- Domain pointing at the server (optional but recommended)
- TLS certificates if you want HTTPS (Let's Encrypt fits the `nginx/certs/` volume)

### Deploy

```bash
# 1. Copy the production env template and fill in real values
cp apps/api/.env.production.example apps/api/.env.production
# Edit DATABASE_URL, JWT_SECRET, POSTGRES_PASSWORD, EMQX_DASHBOARD_PASSWORD

# 2. Bring up the stack (rebuilds the API image from source)
docker compose --env-file apps/api/.env.production -f docker-compose.prod.yml up -d --build

# 3. Run migrations on first deploy
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 4. Seed demo data (optional)
docker compose -f docker-compose.prod.yml exec api node -e "require('./prisma/seed')"

# 5. Verify
curl http://your-domain/health
# → { "status": "ok", "timestamp": "...", "uptime": ... }
```

### Topology

- **nginx** — terminates TLS, proxies `/api/*` and `/socket.io/` to the API. Drop certs into `nginx/certs/` and uncomment the `return 301` redirect for HTTPS-only.
- **api** — multi-stage Node 22 alpine build (`apps/api/Dockerfile`). Healthcheck hits `GET /health`. Restarts unless explicitly stopped.
- **postgres** — alpine image, named volume `pg_data_prod`. Healthcheck via `pg_isready`.
- **emqx** — same image as dev, used by the WebSocket gateway when MQTT support is wired in.

---

## 17. BusManager PWA — Offline Behaviour

The PWA caches at runtime via Workbox (`apps/pwa/src/service-worker/sw.ts`):

| Resource | Strategy | Cache name |
|---|---|---|
| App shell (JS/CSS/HTML/icons) | precache (`injectManifest`) | workbox precache |
| `GET /me/assignments` | NetworkFirst (5 s timeout) | `assignments-cache` |
| `GET .../rounds/:roundId/.../attendance` and `/allocations` | StaleWhileRevalidate | `attendance-cache` |
| `GET /trips/:tripId/passengers` | StaleWhileRevalidate | `passengers-cache` |

When offline:

- `POST .../attendance` is captured by a Workbox **BackgroundSync** queue (`attendance-sync` tag, 24-hour retention) and replayed automatically on reconnect.
- Both `HomePage` and `AttendancePage` show an amber banner — `useOnlineStatus()` listens to `window` `online`/`offline` events.

Production users can install the PWA from Chrome's address-bar prompt; the manifest is at `dist/manifest.webmanifest` after build.

---

## License

UNLICENSED — academic thesis project. *(Đề tài luận văn học thuật.)*
