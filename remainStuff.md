# remainStuff.md — Implementation Status vs. Diagrams

Snapshot of what has been built across Sprints 1–7, what's still missing against the design diagrams in `docs/`, and what's intentionally deferred to Sprints 8–9. Source of truth for design intent: `CLAUDE.md`, `docs/PROJECT_REPORT.md`, and the 7 HTML diagrams in `docs/`.

Date: 2026-05-13 · Branch: `develop` (+ `sprint/sprint-6-attendance`, `sprint/sprint-7-realtime` merged)

---

## 1. Done

### Sprint 1 — Auth, RBAC, Tenant Isolation
- Monorepo with pnpm workspaces: `apps/api · apps/web · apps/pwa · packages/shared`
- Prisma schema with 10 domain tables: `Tenant · User · Trip · Round · Bus · RoundBusAssignment · BusManagerAssignment · TripPassengerAssignment · RoundPassengerAssignment · AttendanceRecord`
- `POST /auth/login` → `{ accessToken, userId, tenantId, role, name }`
- Global guards on every request: `JwtAuthGuard · RolesGuard (@Roles())` · `TenantGuard` (cross-tenant → 403)
- `@Public()` decorator for open routes
- Seed: `admin@demo.com` + `driver@demo.com` + `admin2@other.com` (all `password123`), 2 tenants
- RTK + RTK Query base in web

### Sprint 2 — Trip & Round CRUD
- Trip CRUD `/trips` (Admin write-only), name "/" validation → 400
- **Trip.status auto-derived** from rounds via `TripService.deriveTripStatus()` — computed on read, not stored
- Round CRUD `/trips/:id/rounds`, status transitions: `PLANNED → IN_PROGRESS → DONE | CANCELLED` (invalid → 400)
- Round cancellation cascade hook (`cascadeCancelAttendance`) — wired in Sprint 6
- Trip list date-highlight: approaching (≤3 days) amber, active today green

### Sprint 3 — Bus + Driver Assignment
- Bus CRUD with **3 mandatory photo URLs** (front/side/rear) + capacity
- Duplicate license plate → 409
- `RoundBusAssignment` (`POST /trips/:id/rounds/:id/buses`) — bus assigned to round, **not** trip
- `BusManagerAssignment` (`POST .../buses/:id/manager`) — 1 driver per bus per round
- BusManager cannot write → 403
- shadcn/ui + Tailwind on web, Login page, Bus list with photo thumbnails

### Sprint 4 — Passenger Registration + Sheet Sync
- `TripPassengerAssignment` CRUD `/trips/:id/passengers` (no global Passenger entity)
- Free-text `type` field (KTMT, KHMT, CGC…)
- Bulk import `POST .../passengers/bulk` (Prisma `$transaction`, atomic rollback)
- Sheet sync `POST .../passengers/sheet-sync` — Mode A (template) + Mode B (paste URL with column mapping) — **stubbed** (validates URL but does not call Google Sheets API)
- CSV export `GET .../passengers/export/csv`
- Inline note edit on web

### Sprint 5 — Round Passenger Allocation
- `RoundPassengerAssignment` `POST .../buses/:id/allocations` with capacity warning (HTTP 201 + `capacityWarning` field — not blocked)
- Duplicate allocation → 409
- Admin-only move `PATCH .../allocations/:id/move { toBusId }`
- Movement guard: `round.status === PLANNED` → 400 otherwise
- Trip detail page with round cards + allocation panel + inline move UI

### Sprint 6 — Attendance Workflow
- `AttendanceRecord` upsert `POST .../buses/:id/attendance { rpaIds[], status: JOIN|ABSENT }` (idempotent)
- BusManager scope guard (`verifyBusManagerScope`) → 403 if not own bus
- Admin override `PATCH .../attendance/:id/override` (any record, any status)
- Round-cancel cascade verified: all `AttendanceRecord` → `CANCELLED` (via existing `cascadeCancelAttendance`)
- Summary `GET .../attendance/summary` → `{ total, join, absent, pending, cancelled, operationalNote }`
- Round operational note `PATCH .../rounds/:id/note` (Admin only)
- `/me/assignments` endpoint (BusManager assigned rounds + bus + trip)
- Prisma migration `add_round_operational_note`
- Web Admin: inline `Override` button on allocation rows
- PWA (apps/pwa): Tailwind + shadcn-style UI, RTK store/baseApi/auth, `LoginPage / HomePage / AttendancePage` with `ProtectedRoute`
- 11 new E2E tests

### Sprint 7 — Real-time Monitoring
- `AttendanceGateway` (Socket.io, namespace `/attendance`, JWT-auth on `handleConnection`, rooms `trip:{tripId}`, `join-trip` / `leave-trip` events)
- `markAttendance()` broadcasts `attendance:updated` to room
- `RoundService.updateStatus()` broadcasts `round:status-updated`
- `main.ts` CORS for `:5173` + `:5174`
- Web Admin: `useAttendanceSocket` hook + `LiveDashboardPage` at `/trips/:tripId/dashboard` (per-bus progress bars, live event feed, live/connecting indicator, round-status badges)
- "Live Dashboard" button on `TripDetailPage`
- PWA: `useAttendanceSocket` hook + peer-update banner above passenger list (only shows updates from other buses)
- Gateway unit spec (3 cases) + manual smoke probe `GET /socket.io/?EIO=4&transport=polling` → 200
- All 57 E2E tests still pass
- All 4 packages build clean (web 430KB / 136KB gzip, PWA 399KB / 129KB)

### Cross-cutting
- Comprehensive `README.md` (363 lines, 15 sections per `docs/create-readme.md`)
- `CLAUDE.md` sprint table updated through Sprint 7
- Git: per-sprint branches, merged into `develop` with `--no-ff`, pushed to `origin/develop`. `main` untouched.

---

## 2. Gaps vs. design diagrams (in scope but missed)

These are small in-scope deviations from what the diagrams specify. Each is a self-contained fix.

| # | Gap | Diagram source | Where it lives | Fix size |
|---|---|---|---|---|
| 1 | **Override does not broadcast.** `attendance.service.overrideAttendance()` updates the DB but never calls `gateway.broadcastAttendanceUpdate(...)`. SD-03 step ⑪ requires `emit('attendance.overridden')`. Live Dashboard won't reflect an override until reload. | SD-03 | `apps/api/src/modules/attendance/attendance.service.ts` | ~10 lines |
| 2 | **BusManager can cancel own round.** State-machine permissions matrix says BusManager → Cancel = ✗ not permitted, but `RoundService.updateStatus` only enforces scope (own round), not status restrictions per role. A BusManager can currently send `status: CANCELLED` on their own round. | State machine (§ "Actor permissions summary") | `apps/api/src/modules/round/round.service.ts` | ~5 lines (guard clause) |
| 3 | **Socket.io implementation vs. MQTT diagrams.** Deployment / Component / SD-03 / UC describe an MQTT broker on topics `trip/{id}/attendance` and `trip/{id}/round-status`, with EMQX container provisioned. Implementation uses `@nestjs/websockets` + Socket.io rooms `trip:{id}` with events `attendance:updated` / `round:status-updated`. Functionally equivalent; EMQX is up but unused by code. | Deployment, Component, SD-03, UC §07 | `apps/api/src/gateway/attendance.gateway.ts` | Either rename to align, or migrate to MQTT (~½ day) |
| 4 | **Export is CSV, not xlsx.** UC §10 + PROJECT_REPORT §7.8 say "Export to xlsx". Sprint 4 ships `text/csv`. | UC module 10 | `apps/api/src/modules/passenger/passenger.service.ts:exportCsv` | Swap CSV writer for `xlsx` lib (~30 min) |

---

## 3. Not done — deferred or out of scope

### Sprint 8 — Notifications (planned, not started)
- `NotificationModule` not created
- SMS gateway integration (Twilio / local provider) — `NotificationModule → REST API`
- Microsoft Teams Incoming Webhook
- Telegram Bot API — server-side `sendMessage` (free, no business license; bot token from @BotFather)
- Broadcast Call provider — voice broadcast to all passengers
- `BROADCAST_API_KEY` / `SMS_API_KEY` / `TEAMS_WEBHOOK_URL` env slots already documented in README §8 but not wired
- Activity diagram lane G ("Trigger Notification" → "Dispatch Notification") — both nodes unimplemented

### Sprint 9 — PWA offline-first + Testing + Deployment (planned, not started)
- **PWA offline strategy** (UC §11 «extend» "Use App Offline"):
  - Service Worker pre-cache for round + passenger list + attendance state
  - Background Sync queue for offline `POST .../attendance` requests
  - IndexedDB store for pending marks
  - "Offline" UI indicator and reconnect reconciliation
  - `vite-plugin-pwa` is configured but no offline-write queue
- **Testing & docs**: unit/integration/regression/smoke beyond E2E; technical documentation; demo prep
- **Deployment infra**:
  - Nginx reverse proxy (SSL termination, rate limiting, WSS upgrade)
  - Let's Encrypt TLS 1.3 certs
  - CDN (Vercel / Cloudflare Pages) for static apps
  - `pgBackup` daily cron → S3
  - Docker healthcheck endpoint `GET /health` → 200
  - Restart policy `unless-stopped`
  - Production secrets via Vault / `.env` (not in repo)

### Other gaps (not in any sprint, may need flagging)
- **SystemAdmin features (UC module 02).** Manage Tenants (create / suspend / configure) and Manage Users in Tenant are in the use-case diagram but only seeded — no UI, no endpoints. PROJECT_REPORT §3.1 explicitly tags SystemAdmin as "not a primary demo actor", so the omission is intentional. Flagged for completeness.
- **S3 / Cloudinary for bus photos.** Deployment diagram has a "Bus Photo Bucket" node; current schema just stores `photoFront/photoSide/photoRear` as **URL strings**. Tests use `https://x.com/f.jpg` style placeholders. No upload pipeline, no `FileStorageModule`, no presigned URLs.
- **Swagger / OpenAPI.** Component diagram lists `SwaggerModule`; README §6 marks `/api/docs` as "(planned)". `SwaggerModule.setup()` is not called in `main.ts`.
- **Google Sheets API real integration.** Sheet sync is stubbed: Mode A returns a template note, Mode B validates URL syntax but does not call Google Sheets API. Code note: "To integrate with Google Sheets API, set GOOGLE_SERVICE_ACCOUNT_JSON in env." External Services in Deployment diagram (Google Sheets API v4 OAuth2 service account) is unwired.
- **Tenant filter on login.** `findUnique({ where: { email } })` is global — works because email is unique system-wide, but doesn't enforce tenant scope in the lookup itself. SD-01 step ② shows `findByEmail(email, tenantId)`. Cosmetic; no security issue under the current unique constraint.
- **EMQX broker provisioned, never used.** `docker-compose.yml` runs `emqx:5.7.0` on `1883 / 8083 / 18083`, but no code publishes to it. Tied to gap §2.3.

---

## 4. Test + build status

- **57 / 57 E2E tests passing** across 7 suites: `auth · app · trip · bus · passenger · allocation · attendance`
- **4 unit specs passing** (including 3 `AttendanceGateway` specs)
- **All 4 packages build clean** with zero TypeScript errors
- Web bundle: 430 KB / 136 KB gzip · PWA bundle: 399 KB / 129 KB gzip
- Database migrations applied: `20260513012038_init` + `20260513034250_add_round_operational_note`

---

## 5. Next-step suggestions (not committed)

Two natural next moves, in order of effort:

1. **Diagram-faithfulness pass (~½ day)** — fix gaps §2.1, §2.2, §2.4. Optionally rename Socket.io events to match MQTT topic strings without migrating the underlying broker. Small, self-contained sprint-7-followup branch.
2. **Sprint 8 (Notifications)** — `NotificationModule` scaffold with provider-pluggable strategy (SMS / Teams / Telegram / Broadcast), env-driven credentials, dev mode logs-only, integration into the Admin web. Wires UC module 09 and Activity lane G.

Sprint 9 should follow once Sprint 8 lands, since offline + deployment is the largest remaining chunk and benefits from a stable feature set above it.
