# ReadToKnow — MPMS Project Reference
> Last updated: 2026-05-15

---

## 1. Demo Accounts

Seeded from `apps/api/prisma/seed.ts`. Every account uses password `password123`.

| Role | Email | Password | Tenant | Access |
|------|-------|----------|--------|--------|
| System Admin | sysadmin@platform.com | password123 | Platform | Manage tenants & users; UI redirects to `/system` |
| Admin | admin@demo.com | password123 | Demo Tours | Full trip / round / bus / passenger / allocation operations |
| BusManager (Driver) | driver@demo.com | password123 | Demo Tours | Attendance marking on the PWA only |
| Other Tenant Admin | admin2@other.com | password123 | Other Tours | Cross-tenant isolation demo |

Re-seed at any time:
```bash
cd apps/api && npx ts-node prisma/seed.ts
```

---

## 2. Is the Product Connected to a Real API?

### API Server

- API base URL used by `apps/web`: `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`
  (`apps/web/src/store/baseApi.ts`)
- API base URL used by `apps/pwa`: `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`
  (`apps/pwa/src/store/baseApi.ts`)
- API runs on: `PORT` from `apps/api/.env` (defaults to **3000**)
- How to start API: `pnpm --filter api dev` (or `cd apps/api && pnpm dev`)
- CORS is whitelisted to `http://localhost:5173` and `http://localhost:5174` only
  (`apps/api/src/main.ts`)

### Connection Status

- `apps/web` → API: **YES** — RTK Query `baseApi` with Bearer token from
  `localStorage.accessToken`
- `apps/pwa` → API: **YES** — same RTK Query pattern; offline mutations are queued via
  Workbox `BackgroundSync` and replayed on reconnect (`apps/pwa/src/service-worker/sw.ts`)
- Authentication: JWT HS256, 7-day expiry, signed with `JWT_SECRET` from `.env`. Token is
  attached as `Authorization: Bearer <token>` header by `baseApi.prepareHeaders`.
- Real-time: NestJS `@WebSocketGateway()` on the same port (3000) — see
  `apps/api/src/gateway/`. Web/PWA both connect via the `useAttendanceSocket` hook.

### Real vs Mock Data

- All data is **real** — fetched from PostgreSQL via the NestJS REST API.
- No mock fixtures, no hand-coded sample arrays in production paths.
- Seed data (demo accounts) is the only pre-populated content, written by
  `prisma/seed.ts`.

---

## 3. Database

### Where is the database?

| Field | Value |
|-------|-------|
| Type | PostgreSQL 16 |
| Connection string | `postgresql://dev:***@localhost:5432/passenger_mgmt` (password masked from `apps/api/.env`) |
| Host | `localhost:5432` |
| Database name | `passenger_mgmt` |

### Native or Docker?

This machine runs **native PostgreSQL via the `postgresql` snap**, not the Docker
container in `docker-compose.yml`. Evidence:

```bash
$ pgrep -af postgres
1816 /bin/bash /snap/postgresql/105/ctl-cluster.sh --skip-systemctl-redirect --foreground 16 main start
2358 /usr/lib/postgresql/16/bin/postgres -c config_file=/etc/postgresql/16/main/postgresql.conf
...

$ docker compose ps
passenger-management-system-emqx-1   emqx:5.7.0   Up   # only EMQX
```

Port 5432 is occupied by the snap-managed `postgres` process, so the `postgres`
service in `docker-compose.yml` cannot bind. Choose one:

- **Stay on snap postgres** (current setup) — make sure `dev` / `devpassword` /
  `passenger_mgmt` exist there.
- **Switch to Docker postgres** — stop snap (`sudo snap stop postgresql`) before
  `docker compose up -d`.

### Tables created

10 domain tables under `public`:

```
_prisma_migrations
attendancerecord
bus
busmanagerassignment
round
roundbusassignment
roundpassengerassignment
tenant
trip
trippassengerassignment
user
```

(Inspect via `PGPASSWORD=devpassword psql -h localhost -U dev -d passenger_mgmt -c '\dt'`.)

### Migrations applied

```
apps/api/prisma/migrations/
├── 20260513012038_init/                       — creates all 10 domain tables
└── 20260513034250_add_round_operational_note/ — adds Round.operationalNote field
```

### How to reset database

```bash
cd apps/api
npx prisma migrate reset       # drops, re-migrates, re-seeds (interactive)
# OR step-by-step:
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

---

## 4. How to Run the Project Locally

### Prerequisites

- Node.js ≥ 18 (v22 recommended)
- pnpm ≥ 8 (workspaces enabled — `pnpm-workspace.yaml` already wires `apps/*` and
  `packages/*`)
- Docker — only required for the MQTT broker (EMQX); PostgreSQL can be native
- Git

### Start everything

```bash
# 1. Bring up MQTT (and Postgres if you choose Docker):
docker compose up -d

# 2. Install dependencies (first time):
pnpm install

# 3. Apply migrations + seed (first time):
pnpm --filter api db:migrate
cd apps/api && npx ts-node prisma/seed.ts && cd -

# 4. Start all dev servers:
pnpm dev      # turbo / parallel: api + web + pwa
```

### URLs when running

| Service | URL | Notes |
|---------|-----|-------|
| Admin Web | http://localhost:5173 | Login `admin@demo.com` / `password123` |
| BusManager PWA | http://localhost:5174 | Login `driver@demo.com` / `password123` |
| API | http://localhost:3000 | REST + WebSocket gateway |
| Swagger Docs | http://localhost:3000/api/docs | Generated from Nest controllers |
| Health Check | http://localhost:3000/health | Returns `{ status: "ok", timestamp, uptime }` |
| MQTT (EMQX) | mqtt://localhost:1883 | Dashboard on http://localhost:18083 |

---

## 5. Key Domain Rules (Quick Reference)

1. **Bus → Round (not Trip):** Buses are attached to a specific Round leg via
   `RoundBusAssignment`. The same trip can use different buses on different legs.
2. **No global Passenger entity:** Passengers live only inside `TripPassengerAssignment`.
   Names/phones are trip-scoped data, never reusable across trips.
3. **Move passenger = Admin-only, between rounds, while PLANNED:** No mid-round
   re-shuffles. The "move between buses within a round" feature was deliberately
   removed in the bus-round-assignment sprint.
4. **One `AttendanceRecord` per passenger per round:** `status ∈ { JOIN, ABSENT, CANCELLED }`.
5. **Round CANCELLED cascades:** Cancelling a round flips every attendance record in
   that round to `CANCELLED`.
6. **`Trip.status` is derived** from its rounds — never set directly.
7. **Bus capacity is a warning, not a block:** Over-assignment returns 201 plus a
   `capacityWarning` body that the UI surfaces in amber.
8. **Trip name must not contain `/`** (route safety).
9. **Tenant isolation:** Every authenticated request runs through `TenantGuard`;
   any cross-tenant access returns HTTP 403.
10. **Locked enums (shared package):**
    - `Role`: `SYSTEM_ADMIN | ADMIN | BUS_MANAGER`
    - `TripStatus` / `RoundStatus`: `PLANNED | IN_PROGRESS | DONE | CANCELLED`
    - `AttendanceStatus`: `JOIN | ABSENT | CANCELLED`

---

## 6. Test Suite Status

Counts from `grep -c '^\s*it('` on `apps/api/test/*.e2e-spec.ts`:

| Suite | Tests |
|-------|-------|
| Auth | 6 |
| App (health) | 2 |
| Trip | 10 |
| Bus | 8 |
| Passenger | 18 |
| Allocation | 9 |
| Attendance | 11 |
| Notification | 7 |
| **Total** | **71** |

Run them locally (needs Postgres on 5432):

```bash
cd apps/api && pnpm test:e2e
```

The validation sprint added 2 trip cases (`Trip@#!` → 400, `Hanoi-Sapa Day 1` → 201)
and 4 passenger phone cases (9-digit, 11-digit, hyphen, exact 10-digit). The bus
e2e spec also switched URL photos to base64 `MOCK_PHOTO` to match the new
`@IsString @IsNotEmpty` rules.

---

## 7. Known Issues & Limitations

- **Sheet sync (Google Sheets):** stubbed — accepts a URL, returns a mocked column
  mapping, never reaches Google. Live import is out of scope for the thesis.
- **Bus photos as base64:** stored directly in the `Bus.photo*` String columns. Each
  row can be ~270 KB per image (~800 KB for all three). Fine for the thesis dataset,
  but a real deployment should move to object storage.
- **WebSocket transport:** the architecture docs name MQTT topics (e.g.,
  `trip/{id}/attendance`), but the current implementation uses Socket.io rooms on
  the `/attendance` namespace. EMQX is still in `docker-compose.yml` for the demo
  but is no longer load-bearing for attendance updates.
- **Native vs Docker Postgres:** When the host runs snap PostgreSQL on 5432, the
  Docker `postgres` service will fail to start. See section 3.
- **Sprint feature branches:** historical sprint/* branches are not on origin. The
  commits are reachable through `develop`'s history.
- **System dependencies:** Vite dev servers bind to `127.0.0.1` only — accessing from
  another device on the LAN needs `--host` or a reverse proxy.

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 + TypeScript (strict) + Prisma ORM |
| Database | PostgreSQL 16 (snap or Docker) |
| Real-time | Socket.io (NestJS Gateway, namespace `/attendance`, port 3000) |
| Admin Web | React 18 + Vite + TypeScript + Redux Toolkit / RTK Query |
| BusManager PWA | React 18 + Vite + vite-plugin-pwa (Workbox) + RTK Query |
| Internationalisation | react-i18next (EN/VI toggle, persisted in `localStorage` `mpms-lang`) |
| Shared Types | `@pms/shared` workspace package (pure TypeScript, no framework deps) |
| Auth | JWT HS256, 7-day expiry, Passport JWT strategy |
| Validation | `class-validator` + custom `@IsSimpleText()` constraint |
| Package Manager | pnpm workspaces (`apps/api`, `apps/web`, `apps/pwa`, `packages/shared`) |
| Deployment | Docker Compose (Postgres + EMQX) + Nginx reverse proxy |
| CI helpers | RTK proxy (`rtk`) for token-efficient shell |
