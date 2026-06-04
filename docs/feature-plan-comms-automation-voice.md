# Development Plan — Automated Messaging, Voice Calling & Voice Attendance

> Status: PLANNING (not started). Author note compiled 2026-05-31.
> Scope: the comms features the project *names* but hasn't truly built — automated/event-driven
> messaging, real SMS + Zalo delivery, outbound voice calls to passengers, and (post-MVP) voice
> attendance. Grounded in a code audit of the current `notification` subsystem.
>
> Read alongside: root `CLAUDE.md`, `PROJECT_REPORT.md` §7.6–7.7, and `docs/ui-redesign-notes.md`.

---

## 0. TL;DR

We shipped the **shape** of notifications (Sprint 8) but most of it is a stub. To deliver
"automatically send messages / call the customer / use voice", we need three things the codebase
does **not** have yet:

1. **Real delivery** behind the existing channel stubs (SMS, Zalo) + a provider abstraction.
2. An **automation engine** — domain events (round start, cancel, boarding time) auto-trigger messages.
3. **Voice** — real outbound phone calls with Vietnamese TTS (the "Broadcast Call"), and later voice attendance.

Everything must stay **multi-tenant scoped** (R10) and respect that **passengers are data, not users**
(no app login → reach them only by phone/SMS/voice/Zalo).

---

## 1. Current State (verified by audit)

Files: `apps/api/src/modules/notification/{notification.service.ts,notification.controller.ts,dto/send-notification.dto.ts}`,
`apps/api/src/gateway/attendance.gateway.ts`, `apps/web/src/features/notifications/NotificationPanel.tsx`.

| Channel | Status today | Evidence |
|---|---|---|
| **Teams** | ✅ REAL | `sendTeams()` does a real `fetch()` POST of a MessageCard to `TEAMS_WEBHOOK_URL` (falls back to dev log if unset). |
| **SMS** | ❌ STUB | `sendSms()` checks `SMS_API_KEY` then only `console.log`s `[SMS SENT]` — **no HTTP call** to any provider. |
| **Broadcast "Call"** | ⚠️ HALF | `sendBroadcast()` checks `BROADCAST_API_KEY` (logs only — **no PSTN/voice**) but DOES emit a real `broadcast:call` WebSocket event → PWA shows a full-screen alert modal. So today it's an **in-app driver alert, not a phone call**. |
| **Zalo** | ❌ NOT BUILT | Only a hard-coded `<a href="https://zalo.me/">` in `NotificationPanel.tsx`. No backend, not in the channel enum. |
| **Voice / TTS / telephony** | ❌ ABSENT | No Twilio/Vonage/Stringee, no TTS, no IVR, no SIP/audio anywhere. |
| **Voice attendance (STT)** | ❌ DEFERRED | Marked optional/post-MVP in `CLAUDE.md` + report §7.7 (noise-accuracy concern). |

**Other gaps found:**
- **No automation.** Only the manual `POST /trips/:tripId/rounds/:roundId/notify` (Admin-only). Domain
  events already broadcast over the gateway but never send messages:
  - `round.service.ts updateStatus → broadcastRoundStatusUpdate` (PLANNED→IN_PROGRESS→DONE/CANCELLED)
  - `round.service.ts cascadeCancelAttendance` (bulk CANCELLED)
  - `attendance.service.ts markAttendance / overrideAttendance → broadcastAttendanceUpdate`
  - `allocation.service.ts` capacity warning (returned in response, not pushed)
- **No persistence/audit.** No `NotificationLog` model → no history, delivery status, or cost tracking.
- **No consent/opt-out.** `TripPassengerAssignment.phone` is the only contact field; no opt-out, no Zalo ID.
- **No retry/queue, no scheduling, no templating/i18n of messages, no rate-limit, no recipient filtering** (sends to all, including null phones).
- **Dead UI:** the standalone "Broadcast Call" button in `LiveDashboardPage` has no `onClick` (the working trigger is the `NotificationPanel` inside the allocation panel).
- **EMQX/MQTT broker** is provisioned (`docker-compose.yml`, port 1883) but **unused** — Socket.io is the live channel.

**Good news — clean hook points already exist:** `sendSms()` / `sendBroadcast()` are isolated stubs ready
for a provider SDK; the gateway events are ready for an automation listener; the DTO + controller + RTK
mutation + i18n strings are in place.

---

## 2. Domain & Compliance Constraints (must respect)

- **Passengers are data, not users** → no in-app push to passengers. Reach them only via **phone (SMS/voice)** or **Zalo** (phone-linked). Teams is a **staff/ops** channel, not a passenger channel.
- **Multi-tenant (R10)** → provider credentials and message logs must be **tenant-scoped**. Different tour operators = different Zalo OA / SMS brandname / billing.
- **Authoritative attendance stays with the BusManager.** A passenger pressing "1" on a voice call or replying to Zalo is an **RSVP/intent signal**, NOT an `AttendanceRecord` (which is `JOIN|ABSENT|CANCELLED`, set by BusManager/Admin). Keep these separate to avoid breaking domain rules #5/#6.
- **Vietnam regulatory reality:** SMS **brandname** and **Zalo ZNS** require *pre-registered templates* and *opt-in*; promotional vs transactional rules apply. Voice calls have time-of-day rules. Plan for **consent + approved templates** before any real send to production numbers.

---

## 3. Target Architecture

```
                 Domain events (NestJS EventEmitter2)
   round.status.changed · attendance.marked · boarding.due (scheduler)
                              │
                              ▼
                  ┌───────────────────────────┐
                  │   NotificationDispatcher    │  rules: which event → which channel(s),
                  │   (rules + dedupe + consent) │  to whom, which template, tenant config
                  └───────────────┬─────────────┘
                                  │ enqueue job (BullMQ + Redis)
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │  Provider abstraction  (MessageProvider strategy) │
        │   SmsProvider · ZaloProvider · VoiceProvider ·     │
        │   TeamsProvider · InAppProvider(WebSocket)         │
        └───┬───────────┬───────────┬───────────┬───────────┘
            ▼           ▼           ▼           ▼
         eSMS/Twilio  Zalo ZNS   Stringee/    Socket.io
                                 Twilio Voice  (existing)
                              │ delivery callbacks (webhooks)
                              ▼
                       NotificationLog (status, cost, error)
```

**Key additions:**
- `MessageProvider` interface + per-channel adapters (Strategy pattern — already used for Sheet import).
  Lets us swap providers and run **dev-mode** (log) vs **live** per tenant.
- `NotificationDispatcher` service: subscribes to domain events, evaluates rules + consent + tenant config, renders a template, enqueues jobs. The existing manual `POST …/notify` becomes one more caller of the dispatcher.
- **Queue (BullMQ + Redis):** async send, retry w/ exponential backoff, scheduled/delayed jobs (boarding reminders), rate-limit, dead-letter for manual review.
- **Webhook ingress controller:** provider delivery receipts (SMS DLR, voice status, Zalo events, inbound replies/DTMF) → update `NotificationLog`, capture opt-outs and RSVP intents.

### 3.1 Data model (new Prisma models)

```prisma
model NotificationLog {
  id            String   @id @default(uuid())
  tenantId      String
  tripId        String?
  roundId       String?
  channel       String   // SMS | ZALO | VOICE | TEAMS | IN_APP
  trigger       String   // MANUAL | ROUND_STARTED | ROUND_CANCELLED | BOARDING_REMINDER | ...
  templateKey   String?
  messageText   String
  recipientRef  String?  // tripPassengerAssignmentId (passenger) or userId (staff)
  toContact     String?  // phone / zaloId / teams channel (redact in logs/UI)
  status        String   // QUEUED | SENT | DELIVERED | FAILED | BOUNCED | NO_ANSWER
  providerId    String?  // provider message/call SID
  costMicro     Int?     // optional cost tracking
  errorReason   String?
  rsvp          String?  // optional voice/Zalo confirm: WILL_BOARD | WONT_BOARD (intent only!)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([tenantId, tripId, roundId])
}

model TenantNotificationConfig {     // per-tenant provider credentials + toggles
  tenantId        String  @id
  smsProvider     String? // ESMS | TWILIO | ...
  smsCredsRef     String? // secret ref, NOT the raw key
  zaloOaId        String?
  voiceProvider   String? // STRINGEE | TWILIO
  voiceCredsRef   String?
  autoRules       Json?   // which auto-triggers are enabled
}

// extend TripPassengerAssignment (additive, optional → safe):
//   zaloId        String?
//   contactOptOut Boolean @default(false)
//   channelPref   String?  // SMS | ZALO | VOICE
```

`packages/shared`: extend `NotificationChannel` enum → add `ZALO`, `VOICE`, `IN_APP` (keep `BROADCAST`
as alias or migrate it to `IN_APP`); add `NotificationTrigger`, `RsvpIntent`, and a `NotificationLog` DTO.

### 3.2 Provider recommendations (Vietnam-first, this is a VN tour-bus product)

| Need | VN-first | International fallback |
|---|---|---|
| **SMS** | eSMS.vn, SpeedSMS, Viettel/VNPT brandname | Twilio, AWS SNS, Vonage |
| **Zalo** | **Zalo ZNS** (Zalo Notification Service) via Zalo OA — dominant VN channel | — |
| **Voice call + IVR** | **Stringee** (VN voice API, DTMF, recording) | Twilio Voice (TwiML `<Say>`/`<Gather>`), Vonage Voice |
| **TTS (Vietnamese)** | FPT.AI TTS, Viettel AI TTS | Google Cloud TTS `vi-VN`, AWS Polly |
| **STT (voice attendance)** | FPT.AI ASR, Viettel ASR | Google Cloud Speech `vi-VN`; Web Speech API (browser, free) for MVP |

> Recommendation: **Zalo ZNS first** for passenger messaging (highest open-rate + cheapest in VN),
> **eSMS/Twilio** as SMS fallback, **Stringee** for voice. Abstract behind `MessageProvider` so a
> thesis demo can run in **dev/mock mode** with zero paid accounts.

---

## 4. Phased Roadmap

Each phase is independently demoable. Effort: **S** ≈ ≤2d, **M** ≈ 3–5d, **L** ≈ 1–2wk (solo, thesis pace).

### Phase A — Foundation & "make the stubs real" (priority: HIGH) · M
Make today's channels trustworthy before adding automation.
- Add `NotificationLog` model + write a log row on every send (status lifecycle).
- Introduce `MessageProvider` abstraction; refactor `sendSms/sendTeams/sendBroadcast` behind it; keep **dev-mode** (mock) as default.
- Wire **one real SMS provider** (eSMS or Twilio) behind `SmsProvider`; **recipient filtering** (skip null/invalid phones).
- Webhook controller for delivery receipts → update `NotificationLog.status`.
- Retry + dead-letter via **BullMQ + Redis** (add Redis to `docker-compose.yml`).
- Fix the dead **"Broadcast Call" button** in `LiveDashboardPage` (wire to dispatcher or remove).
- **Acceptance:** a real SMS arrives; failures retried + logged; admin can see a notification history list.

### Phase B — Automation engine (priority: HIGH — this is the headline "auto-send") · L
- Add **NestJS EventEmitter2**; emit domain events from the existing gateway hook points (round status, cascade-cancel, attendance, capacity).
- `NotificationDispatcher` with a **rules table** (per tenant/trip, admin-toggleable):
  - `ROUND_STARTED` → passengers in round: "Xe của bạn đang khởi hành / mời lên xe."
  - `ROUND_CANCELLED` → passengers: cancellation notice (ties to rule #6 cascade).
  - `BOARDING_REMINDER` (scheduled T-minus N before `scheduledDep`) → boarding reminder.
  - `CAPACITY_WARNING` / `DRIVER_ASSIGNED` → **staff** via Teams/PWA (not passengers).
- **Message templating + i18n** (vi/en) with variables (name, trip, round, departure time, bus).
- **Dedupe + rate-limit** (no spam on rapid status flips); per-tenant quotas.
- Admin UI: per-trip toggles for which auto-messages are on; preview template.
- **Acceptance:** starting a round auto-sends (mock or real) to its passengers, logged, deduped, toggle-controlled.

### Phase C — Voice calling to passengers ("Broadcast Call" for real) (priority: MED) · L
- `VoiceProvider` (Stringee or Twilio): place **outbound calls** to passenger phones, play **Vietnamese TTS** ("Xin mời quý khách lên xe số …").
- Broadcast-to-round = fan-out calls with concurrency limit + cost guard; statuses (`NO_ANSWER`, etc.) logged.
- Optional **IVR confirm** ("nhấn 1 nếu bạn sẽ lên xe") → store as `rsvp` **intent only** (never auto-writes `AttendanceRecord`).
- Keep the existing **in-app WebSocket alert** as a separate `IN_APP` channel (rename from `BROADCAST`).
- **Acceptance:** admin triggers a broadcast call; passengers' phones ring and hear the TTS; call results logged; optional press-1 RSVP shows on the dashboard as intent.

### Phase D — Zalo ZNS backend (priority: MED, VN-impactful) · M
- Implement `ZaloProvider` against Zalo OA / **ZNS** (template-based); add `ZALO` to the channel enum + DTO + UI (replace the dead `zalo.me` link).
- Store `zaloId` on `TripPassengerAssignment` (captured at import or via opt-in flow); inbound webhook for replies/opt-out.
- **Acceptance:** a ZNS template message is delivered to a Zalo user; inbound opt-out respected.

### Phase E — Voice attendance (POST-MVP / optional, per report §7.7) · L (research-heavy)
- MVP: PWA uses **Web Speech API** (browser, free, on-device) — BusManager speaks a name/code → fuzzy-match to the bus roster → propose `JOIN` (driver confirms; never auto-final).
- Upgrade path: cloud **vi-VN ASR** (FPT.AI / Viettel / Google) for noisy environments.
- Alternative: **TTS roll-call** (system reads names; driver taps confirm) — often more robust than STT in noise.
- **Acceptance:** in a quiet demo, speaking a passenger name highlights+marks them (with confirm); documented accuracy caveats.

### Cross-cutting — Consent, config & security (do BEFORE any real production send) · M
- Consent/opt-out fields + enforcement; honor SMS STOP / Zalo opt-out.
- `TenantNotificationConfig`: per-tenant provider creds via **secret refs** (never commit keys; not in `.env` for prod).
- Approved-template registry (VN brandname/ZNS requirement).
- Observability: `NotificationLog` dashboards, per-tenant cost/quota, alerting on failure spikes.

---

## 5. Priority / Sequencing

```
A (foundation) ──► B (automation)  ── highest value, do first
        └────────► C (voice)       ── flashy demo; needs A
        └────────► D (Zalo)        ── VN reach; needs A
Cross-cutting (consent/config) ── interleave with A/B, MANDATORY before real prod sends
E (voice attendance) ── last; optional; research spike first
```

Suggested mapping to sprints: **Sprint 10** = A + Cross-cutting; **Sprint 11** = B; **Sprint 12** = C and/or D; **Sprint 13** = E (if pursued).

---

## 6. Quick Wins (low effort, high signal — good for a thesis demo)
- `NotificationLog` + a "Notification history" panel (makes everything else demonstrable). **S**
- Recipient filtering (skip null phones) + per-send result toasts. **S**
- Wire/fix the dead "Broadcast Call" button. **S**
- One auto-trigger end-to-end in **mock mode**: `ROUND_STARTED → SMS(mock)` logged + shown live. **S–M** — proves the automation story without paid accounts.
- Browser **Web Speech API** spike in the PWA for voice attendance (free, no provider). **S**

---

## 7. Risks & Open Questions
- **Provider accounts/cost** for a thesis: default to **mock/dev mode**; gate real sends behind tenant config. Don't block the demo on paid APIs.
- **VN compliance:** brandname/ZNS template approval + opt-in can take time → start early or demo in mock.
- **Domain integrity:** voice/Zalo confirms must NOT write `AttendanceRecord` directly (keep BusManager authority; store as `rsvp` intent). Confirm with stakeholder.
- **Per-tenant secrets management:** where do creds live in prod (Vault/SM)? `.env` is dev-only.
- **PWA offline + automation:** auto-sends are server-side (fine offline-for-driver); ensure scheduled reminders survive API restarts (BullMQ persistence in Redis).
- **MQTT (EMQX) is idle** — decide: use it for notification fan-out, or remove from compose to cut confusion.

---

## 8. First Concrete Steps (when development starts)
1. Add Redis to `docker-compose.yml`; install `@nestjs/event-emitter`, `bullmq`.
2. Create `NotificationLog` + migration; log every existing send (no behavior change yet).
3. Extract `MessageProvider` interface; move the 3 current methods behind adapters (dev-mode preserved).
4. Implement `SmsProvider` (eSMS or Twilio) + delivery webhook; flip one tenant to live in staging.
5. Stand up `NotificationDispatcher` + EventEmitter; ship the first auto-trigger (`ROUND_STARTED`) in mock mode end-to-end.

*(All new external calls must be tenant-scoped and secret-backed; never commit provider keys.)*
