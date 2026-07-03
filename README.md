# Passenger Management System

Thesis: "Develop a website for tracking passenger attendance on tourist buses"
*(Luận văn: Xây dựng website theo dõi điểm danh hành khách trên xe du lịch)*

**Stack:** NestJS · React · PostgreSQL · Redis (BullMQ) · Socket.IO · PWA
**Tests:** 85 E2E across 9 suites + 31 unit specs (116 cases)
**Sprints:** 1–9 all complete

### 🔗 Live Demo

| App | URL |
|-----|-----|
| Admin Web | https://web-pi-nine-58.vercel.app |
| BusManager PWA (driver) | https://pwa-sage-phi.vercel.app |
| API | https://mpms-api-production.up.railway.app |
| API Docs (Swagger) | https://mpms-api-production.up.railway.app/api/docs |

Demo login (every account): **`admin123`** — super admin `admin@super.com`, tenant admin `admin@demo.com`, driver `driver@demo.com`. Full list in §7.

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
                                                  │ Redis (BullMQ) │
                                                  │  :6379         │
                                                  └────────────────┘
```

- **Admin Web** speaks REST + Socket.IO to the API.
- **BusManager PWA** speaks REST + Socket.IO and is a full **offline-first** PWA — Workbox service worker + Background Sync (Sprint 9, done).
- **Redis** backs a **BullMQ** queue for notification delivery/retries; the hosted demo uses Upstash (`rediss://`).
- Real-time runs over **Socket.IO** only. `docker-compose.yml` still ships an **EMQX/MQTT** broker, but it is **not used at API runtime** (legacy scaffold).

---

## 4. Repository Structure

```
passenger-management-system/
├── apps/
│   ├── api/                   # NestJS backend
│   │   ├── prisma/            # Schema, migrations, seed
│   │   ├── src/
│   │   │   ├── auth/          # JWT login + change-password
│   │   │   ├── common/        # Guards (Jwt, Roles, Tenant), crypto, decorators
│   │   │   ├── gateway/       # Socket.IO AttendanceGateway (/attendance)
│   │   │   └── modules/       # trip, round, bus, assignment, passenger,
│   │   │                      # allocation, attendance, me, users,
│   │   │                      # system-admin, notification, notification-config
│   │   └── test/              # 9 E2E suites (85) + unit specs (31)
│   ├── web/                   # Admin Web App (React + Vite)
│   │   └── src/features/      # auth, trips, buses, passengers, allocation,
│   │                          # dashboard, notifications, settings,
│   │                          # system-admin, users, me
│   └── pwa/                   # BusManager PWA (React + Vite + vite-plugin-pwa)
│       └── src/features/      # auth, home, attendance
├── packages/
│   └── shared/                # Shared TypeScript types + enums
├── docs/                      # Diagrams (ERD, UC, Activity, Sequence, ...)
├── docker-compose.yml         # PostgreSQL + Redis + EMQX (legacy)
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

> Vietnamese note: máy host cần cài Node, pnpm, Docker; PostgreSQL, Redis và EMQX đều chạy bằng Docker — không cần cài thêm.

---

## 6. Quick Start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/ManhVuCode/passenger-management-system
cd passenger-management-system
git checkout develop

# 2. Install all dependencies
pnpm install

# 3. Start Docker services (PostgreSQL + Redis + EMQX)
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
| API Docs | http://localhost:3000/api/docs | Swagger / OpenAPI |
| Admin Web | http://localhost:5173 | Admin dashboard (desktop) |
| BusManager PWA | http://localhost:5174 | Driver mobile app |
| WebSocket | ws://localhost:3000/attendance | Live attendance broadcast |

---

## 7. Demo Credentials

**Hosted demo** (the live URLs above) — every account uses the password **`admin123`**:

| Role | Email | Password | Tenant |
|------|-------|----------|--------|
| SystemAdmin (super admin) | admin@super.com | `admin123` | — (platform) |
| Admin | admin@demo.com | `admin123` | demo-tours |
| BusManager (driver) | driver@demo.com | `admin123` | demo-tours |
| Admin (cross-tenant) | admin2@other.com | `admin123` | other-tours |

The cross-tenant admin proves tenant isolation: requesting `demo-tours` resources returns HTTP 403.
SystemAdmin can view every user's current password — reversible `PASSWORD_ENC_KEY` decryption plus login-capture — under **System → tenant → users**.

> **Local seed** (`pnpm db:seed`, see `apps/api/prisma/seed.ts`) creates `sysadmin@platform.com`, `admin@demo.com`, `driver@demo.com`, and `admin2@other.com` with the password **`password123`**. The hosted demo above was later normalised to `admin123`.

---

## 8. Environment Variables

### `apps/api/.env` (see `apps/api/.env.example`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | Prisma runtime connection (Supabase pooler `:6543` in prod) |
| `DIRECT_URL` | ✅ | Direct connection for migrations (`:5432`) |
| `JWT_SECRET` | ✅ | JWT signing key |
| `JWT_EXPIRES_IN` | ✅ | Token expiry (e.g. `7d`) |
| `PORT` | ✅ | API port (default `3000`) |
| `NODE_ENV` | ❌ | `development` / `production` |
| `CORS_ORIGINS` | ❌ | Comma-separated allowed origins (REST + Socket.IO) |
| `PASSWORD_ENC_KEY` | ❌ | AES key so SystemAdmin can view users' current passwords |
| `REDIS_URL` | ❌ | BullMQ queue (`redis://…` local, `rediss://…` for Upstash TLS) |
| `EMAIL_PROVIDER` / `BREVO_API_KEY` / `EMAIL_FROM` / `EMAIL_FROM_NAME` | ❌ | Email channel (Brevo); `MOCK` just logs |
| `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SECRET_KEY` / `SMS_BRANDNAME` / `SMS_FROM` | ❌ | SMS channel (`MOCK` / eSMS / Twilio) — UI still marked "in development" |
| `BROADCAST_API_KEY` | ❌ | In-app broadcast channel |

> Telegram bot tokens are **not** env vars — they are stored per tenant in the database and managed via `PUT /notification-config/telegram`.

### `apps/web/.env` and `apps/pwa/.env`

| Variable | App | Default | Purpose |
|----------|-----|---------|---------|
| `VITE_API_URL` | web + pwa | `http://localhost:3000` | REST + Socket.IO base URL |
| `VITE_PWA_URL` | web | `http://localhost:5174` | Unified-login handoff → driver PWA |
| `VITE_WEB_URL` | pwa | `http://localhost:5173` | Unified-login handoff → admin web |

---

## 9. Available Scripts

Run from the project root unless noted otherwise:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + Admin Web + PWA in parallel |
| `pnpm setup` | Generate Prisma client + apply migrations (`migrate deploy`) |
| `pnpm build` | Build all packages (`shared` → `api` → `web` → `pwa`) |
| `pnpm test` | Run the API test suite |
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

Selected routes — the full, always-current list is in **Swagger** at `/api/docs`, or the controllers under `apps/api/src/modules/`.

```
Auth
  POST   /auth/login
  POST   /auth/change-password

System (SystemAdmin only)
  GET    /system/tenants
  POST   /system/tenants
  PATCH  /system/tenants/:id
  GET    /system/tenants/:id/users            ?includePassword=true → current passwords
  POST   /system/tenants/:id/users
  PATCH  /system/tenants/:id/users/:userId
  PATCH  /system/tenants/:id/users/:userId/reset-password
  DELETE /system/tenants/:id/users/:userId

Users (Admin — own tenant)
  GET | POST | PATCH | DELETE   /users[/:id]

Trips / Rounds
  GET | POST | PATCH | DELETE   /trips[/:id]
  GET | POST                    /trips/:tripId/rounds
  PATCH                         /trips/:tripId/rounds/:id/status

Buses
  GET | POST | PATCH | DELETE   /buses[/:id]
  PATCH                         /buses/:id/move            (reorder — swap)

Assignment
  POST | DELETE   /trips/:tripId/rounds/:roundId/buses[/:busId]
  POST | DELETE   /trips/:tripId/rounds/:roundId/buses/:busId/manager

Passengers
  GET | POST | PATCH | DELETE   /trips/:tripId/passengers[/:id]
  POST   /trips/:tripId/passengers/bulk           (xlsx/CSV rows parsed client-side)
  POST   /trips/:tripId/passengers/sheet-sync     (Google Sheet)
  GET    /trips/:tripId/passengers/export/xlsx

Allocation
  GET    /trips/:tripId/rounds/allocations-summary
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/allocations
  PATCH  /trips/:tripId/rounds/:roundId/allocations/:id/move

Attendance
  GET    /trips/:tripId/rounds/:roundId/buses/:busId/attendance
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/attendance
  POST   /trips/:tripId/rounds/:roundId/buses/:busId/attendance/reset
  PATCH  /trips/:tripId/rounds/:roundId/attendance/:id/override
  GET    /trips/:tripId/rounds/:roundId/attendance/summary
  PATCH  /trips/:tripId/rounds/:roundId/note

Notifications
  POST   /trips/:tripId/rounds/:roundId/notify
  GET    /trips/:tripId/rounds/:roundId/notify/email-recipients
  GET    /trips/:tripId/notifications                 (history)
  GET | PUT          /notification-config/auto-rules
  GET | PUT | DELETE /notification-config/telegram

Me / Health
  GET    /me/assignments        (BusManager: assigned rounds + bus)
  GET    /health

WebSocket (Socket.IO)
  namespace: /attendance
  client → server: join-trip, leave-trip
  server → client: attendance:updated, round:status-updated, broadcast:call
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

Current status: **85 E2E cases across 9 suites**, plus **31 unit specs** (116 total):

| E2E Suite | Tests | Coverage |
|-----------|:-----:|----------|
| auth.e2e | 7 | Login, JWT, change-password, protected routes |
| app.e2e | 3 | Bootstrap smoke + health |
| trip.e2e | 11 | Trip CRUD, name validation, derived status |
| bus.e2e | 9 | Bus CRUD, plate uniqueness, photos, reorder |
| passenger.e2e | 19 | CRUD, bulk import, sheet sync, xlsx export |
| allocation.e2e | 10 | Allocate, move, capacity warning, scope guards |
| attendance.e2e | 12 | Mark, scope, override, cascade, summary, note |
| notification.e2e | 7 | Send, recipients, config, history |
| users.e2e | 7 | User CRUD + tenant scoping |

Unit specs (31): `trip.service`, `assignment.service`, `attendance.service`, `attendance.gateway`, `notification.dispatcher`, `telegram.service`, `telegram.provider`, `app.controller`.

---

## 13. Docker Services

| Service | Image | Ports | Purpose |
|---------|-------|------:|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | BullMQ queue (notification delivery/retries) |
| `emqx` | `emqx/emqx:5.7.0` | 1883, 8083, 18083 | MQTT broker — legacy, unused at API runtime |

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
| `docs/swagger-guide.md` | How to read/use the Swagger API docs |
| `docs/tutorial.md` · `docs/ReadToKnow.md` | Setup walkthrough + onboarding notes |

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
| 8 | Notifications (SMS / Telegram / Email / In-app Broadcast) | ✅ Done |
| 9 | PWA offline-first (Service Worker + Background Sync) · Testing · Deployment | ✅ Done |

---

## 16. Production Deployment

### Hosted demo (current)

The live demo runs fully managed — no servers to babysit:

| Component | Platform | Where it's configured |
|-----------|----------|-----------------------|
| Admin Web | **Vercel** | `apps/web/vercel.json` (pnpm-filtered build) → https://web-pi-nine-58.vercel.app |
| BusManager PWA | **Vercel** | `apps/pwa/vercel.json` (pnpm-filtered build) → https://pwa-sage-phi.vercel.app |
| API | **Railway** | `apps/api/Dockerfile` → https://mpms-api-production.up.railway.app |
| Database | **Supabase** PostgreSQL | `DATABASE_URL` (pooler `:6543`) + `DIRECT_URL` (`:5432`) |
| Queue cache | **Upstash** Redis | `REDIS_URL` (`rediss://…`) |

- Each frontend builds the shared package first, then itself, via the `buildCommand` in its `vercel.json`.
- Railway builds the API image from `apps/api/Dockerfile` and injects `DATABASE_URL`, `JWT_SECRET`, `PASSWORD_ENC_KEY`, `REDIS_URL`, etc. as service variables.
- Frontends reach the API through `VITE_API_URL`; unified login hands sessions between web and PWA via `VITE_PWA_URL` / `VITE_WEB_URL`.

### Self-hosted (alternative)

The repository also ships a single-box stack via `docker-compose.prod.yml` — Nginx reverse proxy + NestJS API (Dockerised) + PostgreSQL + EMQX, with healthchecks and restart policies.

#### Prerequisites

- Docker + Docker Compose on the target server
- Domain pointing at the server (optional but recommended)
- TLS certificates if you want HTTPS (Let's Encrypt fits the `nginx/certs/` volume)

#### Deploy

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

#### Topology

- **nginx** — terminates TLS, proxies `/api/*` and `/socket.io/` to the API. Drop certs into `nginx/certs/` and uncomment the `return 301` redirect for HTTPS-only.
- **api** — multi-stage Node 22 alpine build (`apps/api/Dockerfile`). Healthcheck hits `GET /health`. Restarts unless explicitly stopped.
- **postgres** — alpine image, named volume `pg_data_prod`. Healthcheck via `pg_isready`.
- **emqx** — same image as dev; shipped for parity but **not used at runtime** (real-time is Socket.IO on the API).

---

## 17. BusManager PWA — Offline Behaviour

The PWA caches at runtime via a hand-written Workbox service worker (`apps/pwa/src/service-worker/sw.ts`, `injectManifest`):

| Resource | Method | Strategy | Cache name |
|---|:---:|---|---|
| App shell (JS/CSS/HTML/icons) | — | precache (`__WB_MANIFEST`) + `NavigationRoute` | workbox precache |
| `POST .../attendance` | POST | **NetworkFirst + BackgroundSync** | `attendance-posts` |
| `GET .../attendance` and `/allocations` | GET | NetworkFirst (5 s timeout) | `attendance-cache` |
| `GET /me/assignments` | GET | NetworkFirst (5 s timeout) | `assignments-cache` |
| `GET /trips` (list/detail) | GET | NetworkFirst (5 s timeout) | `trips-cache` |
| `GET /trips/:tripId/passengers` | GET | NetworkFirst (5 s timeout) | `passengers-cache` |

When offline:

- `POST .../attendance` is captured by a Workbox **BackgroundSync** queue (`attendance-sync` tag, 24-hour retention) and replayed automatically on reconnect; the optimistic RTK Query update survives the `FETCH_ERROR`/`TIMEOUT_ERROR`, so the mark stays on screen.
- The GET reads use **NetworkFirst with a short timeout** (not StaleWhileRevalidate), so a cached copy never briefly overwrites a just-changed status; when the network is down they fall back to the cache.
- Both `HomePage` and `AttendancePage` show an amber banner — `useOnlineStatus()` listens to `window` `online`/`offline` events.

Production users can install the PWA from Chrome's address-bar prompt; the manifest is at `dist/manifest.webmanifest` after build.

---

## License

UNLICENSED — academic thesis project. *(Đề tài luận văn học thuật.)*
