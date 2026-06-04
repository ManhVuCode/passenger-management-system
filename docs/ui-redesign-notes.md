# UI Redesign — Working Notes (PROMPT_2_UI_REDESIGN_MASTER)

Running log for the master frontend UI redesign. Read this + `../CLAUDE.md` to resume.

## Direction (PHASE 1 — LOCKED)
- **Option C — Minimal Precision**, adapted: **keep the existing sky/navy brand** (`primary #0369A1`) as the interactive accent (swapping to indigo would ripple through every component for no gain). Express "minimal precision" via composition, whitespace, defined type rhythm in primitives — not by overriding global `fontSize`/`spacing` tokens.
- App is **light-mode only**; `.glass`/`.glass-dark` utils are defined but unused (dormant). Options A/B in the prompt assumed dark/glass — corrected.

## LOCKED requirement (user)
- **Tab transitions** across **Web + PWA**: `opacity 0→1, translateY 8px→0, 200ms ease-out` via Framer `AnimatePresence`. Implemented as `<TabTransition tabKey=…>` (`components/ui/tab-transition.tsx`). Apply to every tab group: TripDetail (Overview/Rounds/Passengers/Buses/Allocation), PassengerList (list/add/sheet), TripList filter tabs, and any PWA tabs (PWA has none yet — apply if added).

## Route corrections (prompt's assumptions were wrong)
- Live Attendance dashboard = **`/trips/:id/dashboard`** (`features/dashboard/LiveDashboardPage.tsx`), NOT `/trips/:id/attendance`.
- No `/settings` page. Instead `/users` (UserManagement) + `/system` (SystemAdmin, SYSTEM_ADMIN only).
- PWA "Round Status" actions live inside `AttendancePage.tsx` (`ConfirmCompleteModal`), not a separate page.

## PHASE 2 — Design System Foundation ✅ DONE (web build clean)
New shared primitives in `apps/web/src/components/ui/`:
- `skeleton.tsx` — loading placeholder (animate-pulse)
- `metric-card.tsx` — extracted from inline `StatCard` (1:1 API: label/value/icon/color/bg/trend?/onClick?)
- `page-header.tsx` — title/subtitle/leading/actions
- `section-card.tsx` — titled container card (note: extends `Omit<HTMLAttributes,'title'>`)
- `empty-state.tsx` — icon/title/description/action
- `confirm-dialog.tsx` — Framer modal for destructive actions (open/title/desc/confirm/cancel/loading/error/variant)
- `data-table.tsx` — generic `<DataTable<T>>`: sticky header, client-side sort, skeleton rows, empty slot
- `tab-transition.tsx` — the locked tab animation
Config: added `fade-in`/`slide-up`/`shimmer` keyframes+animation to BOTH `tailwind.config.js` (kept byte-identical). No token removals.

**Not yet wired into pages** — primitives are built but pages still use inline patterns. That swap is PHASE 3.

## PHASE 3 — Page elevation (in progress)
chrome-devtools MCP is live (run `start-chrome-devtools` first). Demo login: `admin@demo.com` / `password123`. IN_PROGRESS trip for live views: `d35a07c8-7ea3-4eeb-9583-dbc6af329cb5`.
Also fixed: `PageHeader` h1 bumped to text-3xl (was text-2xl) to avoid downgrading existing pages.

- ✅ **Dashboard** — StatCards→MetricCard, greeting→PageHeader, 2 info cards→SectionCard, Recent Trips→DataTable (sortable, skeleton, EmptyState). Build+console clean.
- ✅ **TripList** — StatCards→MetricCard, `<TabTransition>` on All/Active/Upcoming/Done, delete→ConfirmDialog (loading+error), EmptyState, `⚡` emoji→Zap icon (i18n cleaned en+vi, `trips.failedDelete` added). Verified live (filter + dialog).
- ✅ **Users** — header→PageHeader, 3 StatCards→MetricCard, table→DataTable<UserItem> (sortable, avatar, YOU badge, role Badge, actions), delete→ConfirmDialog. Build+render clean.
- ✅ **Buses** — PageHeader, EmptyState (w/ Register CTA), plate+capacity as Badge (plate mono), delete→ConfirmDialog. Also PhotoUploadInput: `✓`→CheckCircle2 + i18n'd "Image loaded" (`buses.imageLoaded`).
- ✅ **Passengers** — emoji 🔍⚠✓✗→Lucide; window.alert→inline auto-dismiss success banner (stripped `✓` from importedCount); added delete ConfirmDialog (was fire-and-forget!); EmptyState. KEPT custom table (dynamic per-round attendance cols + inline note edit don't fit DataTable); skipped TabTransition (list/add/sheet are additive panels above a persistent table, not a tab strip).
- ✅ **LiveDashboard (P1)** — hero MetricCard row (Total/Joined/Absent/Pending, round totals); count emoji ✓✗?→Lucide Check/X/Clock; mono plate; TabTransition on round change; EmptyState×2; simplified connection indicator; i18n'd "Marked {status}" (attendance.markedStatus) + attendance.totalLabel. KEPT custom sticky header + bus cards (PageHeader/SectionCard don't fit a compact live toolbar / icon-header card). All WebSocket logic untouched. Verified populated (Round 2, 7 pax).
- ✅ **TripDetail (P2)** — title→text-3xl; Quick Actions→SectionCard; no-rounds→EmptyState (w/ Add Round CTA); bus-assign window.alert→inline dismissible banner (busError state); remove-allocation `✕`→Lucide X. KEPT custom header (back-arrow-left) + rounds timeline + allocation panel structure (per critic: don't wrap sticky panel in SectionCard); R4 driver-guard preserved.
- ✅ **Login (P5)** — inputs focus ring → ring-2 ring-primary-600/30 (more visible/accessible); error banner rounded-xl px-4 py-3. Auth logic untouched.

## ALL 8 WEB PAGES DONE ✅ (PHASE 2 foundation + PHASE 3 pages)
Commits: 6198f40b (foundation + Dashboard/Trips/Users), e393f2c7 (Buses+Passengers), a0a6815f (LiveDashboard), ca07b471 (TripDetail+Login); plus c501d12e (R4 guard). All builds clean, consoles clean, verified live in browser.

## NOT YET DONE (original PROMPT_2 scope beyond the 8 web pages)
- **PHASE 4 — PWA elevation** (apps/pwa): attendance page, home/round list, login — mobile-first, offline-first. NOT started. The shared primitives are web-only; PWA has its own components/ui (badge/button/card/input) — would need primitives ported or built there.
- **PHASE 5 polish** partially done (skeletons on Dashboard/DataTables, EmptyState everywhere, TabTransition). Not done: skeletons on every list, staggered list animations, 404 page.
- **PHASE 6 quality gate**: builds clean ✓; Lighthouse audit (perf/a11y ≥80) via chrome-devtools MCP NOT run; mobile 390x844 emulation NOT run.
- Remaining emoji in i18n VALUES not on the 8 done pages: `●` trips.activeNowBadge (unused?), `▶`/`✓` rounds.startRound/completeRound, `✓`/`⚡` attendance.summary/completeRound/offline/passwordChanged (PWA-shared), `🗂`/`🚌` SystemAdmin help (also hardcoded VI). SystemAdminPage (/system) not redesigned (SYSTEM_ADMIN only).
- New i18n keys this batch: attendance.totalLabel, attendance.markedStatus (en+vi). Note existing attendance.total ('{{count}} total') already exists — don't collide.
- New i18n keys added: buses.imageLoaded, passengers.deletePassengerTitle/deletePassengerConfirm (en+vi).
- Fix1 (PROMPT 3): MetricCard is now a clickable button (ArrowUpRight affordance); ?status= filter scheme on trips. Committed: 6198f40b (redesign+fix1), c501d12e (R4 guard).
- Emoji still in i18n values not yet cleared (note for completeness): `●` activeNowBadge, `▶`/`✓` rounds start/complete, `✓` attendance.summary/passwordChanged/importedCount, `⚡` attendance.offline, `🗂`/`🚌` SystemAdmin help (also hardcoded VI string). Clear when touching those pages.

Spec workflow output (per-page specs + critic verdicts) archived at: tasks/wd7c13prx.output. Critics flagged: agents hallucinated emoji line numbers (use real audit); keep LiveDashboard round items as buttons (a11y); reuse `dashboard.recentTrips` key; ConfirmDialog onConfirm wraps async delete.

## NEXT (needs Claude Code restart so chrome-devtools MCP tools load)
1. **Restart Claude Code**, then run `start-chrome-devtools` (see [[chrome-devtools-mcp-setup]] memory).
2. PHASE 0.1 — capture before/after screenshots of all Web + PWA pages as baselines.
3. PHASE 3 page-by-page (priority order): LiveDashboard → TripDetail → Dashboard → Buses → Login. Swap inline patterns for the new primitives + apply `<TabTransition>`. Replace 3 stray `window.alert()` (TripDetail ×2, PassengerList ×1) and emoji icons (`✓ ✗ 🚌 ▼`) with Lucide.
4. PHASE 4 PWA, PHASE 5 polish (skeletons/empty/error), PHASE 6 quality gate (build clean + Lighthouse ≥80 via MCP).

## Constraints (do not violate)
No business-logic/domain-rule changes · no i18n key deletion (add/update only) · no API/RTK signature changes · no new deps · don't break WebSocket · don't commit on build error · commit only when user asks.
