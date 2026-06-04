# Tutorial — Run the Passenger Management System Locally

Step-by-step copy-paste commands to get the full stack running from a fresh clone. All paths assume the project root is `passenger-management-system/`.

---

## Step 0 — Prerequisites

Install once on your machine:

| Tool | Minimum | Verify |
|---|---|---|
| Node.js | 18 (22 LTS recommended) | `node --version` |
| pnpm | 8 (10+ tested) | `pnpm --version` |
| Docker Engine + Compose v2 | latest | `docker --version && docker compose version` |
| Git | 2.30+ | `git --version` |

> **Heads-up:** the dev stack binds PostgreSQL to host port `5432`. If you already run a native Postgres on that port, either stop it or change the published port in `docker-compose.yml`.

---

## Step 1 — Clone and switch to the dev branch

```bash
git clone https://github.com/ManhVuCode/passenger-management-system
cd passenger-management-system
git checkout develop
```

---

## Step 2 — Install dependencies

Single command installs every workspace (`apps/api`, `apps/web`, `apps/pwa`, `packages/shared`):

```bash
pnpm install
```

---

## Step 3 — Start backing services (Postgres + EMQX MQTT broker)

```bash
docker compose up -d
```

Verify they're up:

```bash
docker compose ps
```

You should see two containers `Up`: `*-postgres-1` (port 5432) and `*-emqx-1` (ports 1883 / 8083 / 18083).

Wait for Postgres to be ready:

```bash
docker exec passenger-management-system-postgres-1 \
  pg_isready -U dev -d passenger_mgmt
```

Expect `/var/run/postgresql:5432 - accepting connections`.

---

## Step 4 — Configure the API environment

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and confirm:

```
DATABASE_URL="postgresql://dev:devpassword@localhost:5432/passenger_mgmt"
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
```

The Compose file uses the same credentials, so the defaults work out of the box.

(`apps/web/.env` and `apps/pwa/.env` already point to `http://localhost:3000` — no action needed.)

---

## Step 5 — Run database migrations and seed demo data

```bash
pnpm db:migrate
pnpm db:seed
```

`db:migrate` applies the two Prisma migrations (`init` + `add_round_operational_note`) and creates 10 tables. `db:seed` inserts 2 tenants and 3 demo users.

Demo accounts (all use password `password123`):

| Email | Role | Tenant |
|---|---|---|
| `admin@demo.com` | ADMIN | demo-tours |
| `driver@demo.com` | BUS_MANAGER | demo-tours |
| `admin2@other.com` | ADMIN | other-tours (used to prove cross-tenant isolation) |

---

## Step 6 — Start all three apps in parallel

```bash
pnpm dev
```

This runs `api`, `web`, and `pwa` simultaneously via `concurrently`.

When you see the API banner

```
API running on http://localhost:3000
Swagger UI on http://localhost:3000/api/docs
WebSocket gateway on ws://localhost:3000/attendance
```

everything is live.

| App | URL |
|---|---|
| REST API | http://localhost:3000 |
| Swagger / OpenAPI | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/health |
| Admin Web (React) | http://localhost:5173 |
| BusManager PWA | http://localhost:5174 |

Stop everything with `Ctrl+C`.

---

## Step 7 — Smoke-test the running stack (optional)

In a second terminal:

```bash
# Health
curl http://localhost:3000/health
# → {"status":"ok",...}

# Admin login → JWT
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}'

# Protected route without token → 401
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/trips
```

In the browser:

1. Open http://localhost:5173, sign in as `admin@demo.com / password123`.
2. Create a trip, a round, a bus (with three placeholder photo URLs), and a passenger.
3. Open http://localhost:5174 in another window or on a phone (same Wi-Fi works too), sign in as `driver@demo.com / password123` to see the BusManager flow.

---

## Step 8 — Run tests

```bash
# All unit tests (Jest)
cd apps/api && pnpm test

# All E2E tests (also Jest, but separate config — requires Postgres up)
cd apps/api && pnpm test:e2e

# Single E2E suite, e.g. attendance
cd apps/api && pnpm test:e2e -- --testPathPatterns=attendance
```

Expected on green: 13 unit + 65 E2E pass.

---

## Step 9 — Useful day-to-day commands

| Command | What it does |
|---|---|
| `pnpm build` | Production build of all four packages |
| `pnpm db:migrate` | Apply or create Prisma migrations |
| `pnpm db:seed` | Re-seed demo data |
| `pnpm db:studio` | Launch Prisma Studio DB GUI on http://localhost:5555 |
| `pnpm --filter api dev` | Run only the API (watch mode) |
| `pnpm --filter web dev` | Run only the Admin Web |
| `pnpm --filter pwa dev` | Run only the BusManager PWA |
| `docker compose logs -f postgres` | Tail Postgres logs |
| `docker compose down` | Stop services (keeps DB data) |
| `docker compose down -v` | Stop services and **delete** the DB volume |

---

## Step 10 — Common troubleshooting

- **Port 5432 already in use** → stop the host's native Postgres (`sudo systemctl stop postgresql`) or edit the `ports:` mapping in `docker-compose.yml`.
- **`prisma migrate dev` fails with "database does not exist"** → `docker compose up -d postgres` first.
- **`pnpm install` warns about ignored build scripts** → harmless for dev; run `pnpm approve-builds` if you want to whitelist them.
- **PWA Service Worker won't update** → in DevTools → Application → Service Workers → "Unregister", then hard-reload.
- **WebSocket / live dashboard not updating** → confirm `GET /socket.io/?EIO=4&transport=polling` returns 200 and the browser console shows a successful `connect` on `/attendance`.
- **All E2E tests fail with "Cannot connect to database"** → `pg_isready` first, then `pnpm db:migrate` to make sure tables exist.

---

## Step 11 — Production deployment (overview)

For full production, see **README §16 "Production Deployment"**. Three-command summary:

```bash
cp apps/api/.env.production.example apps/api/.env.production
# Edit JWT_SECRET, POSTGRES_PASSWORD, etc.

docker compose --env-file apps/api/.env.production \
  -f docker-compose.prod.yml up -d --build

docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy
```

This brings up Nginx + dockerised API + Postgres + EMQX with healthchecks.

---

## Reset everything

If something gets stuck and you want a clean slate:

```bash
# Stop apps (Ctrl+C in the pnpm dev terminal)
docker compose down -v       # destroys the DB volume too
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Done — you're back at Step 6.
