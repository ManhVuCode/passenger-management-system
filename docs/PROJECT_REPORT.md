# Passenger Attendance Management System — Comprehensive Project Report

**Thesis Title:** Develop a Website for Tracking Passenger Attendance on Tourist Buses
**Technology Stack:** React · TypeScript · NestJS · PostgreSQL · Prisma ORM
**Architecture:** Multi-Tenant SaaS · REST API · PWA · WebSocket/MQTT
**Report Date:** May 2026
**Implementation Status:** Sprint 1 Complete — Sprint 9 Roadmap Active

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Business Problem](#2-core-business-problem)
3. [System Actors & Roles](#3-system-actors--roles)
4. [Multi-Tenant Architecture](#4-multi-tenant-architecture)
5. [Core Domain Model](#5-core-domain-model)
6. [Key Domain Rules (Locked)](#6-key-domain-rules-locked)
7. [Feature Specification](#7-feature-specification)
8. [System Architecture](#8-system-architecture)
9. [Database Design (ERD)](#9-database-design-erd)
10. [Status & Workflow Design](#10-status--workflow-design)
11. [UI Structure](#11-ui-structure)
12. [Sprint Roadmap](#12-sprint-roadmap)
13. [What Makes This Project Special](#13-what-makes-this-project-special)

---

## 1. Project Overview

This project implements a **production-grade, multi-tenant passenger attendance tracking system** for tourist bus operations. The system is purpose-built for the operational reality of multi-bus, multi-leg tourist trips — a domain where traditional spreadsheet tools break down due to the complexity of dynamic passenger-bus allocation across multiple journey segments (rounds).

### Key Metrics

| Dimension | Value |
|-----------|-------|
| **Architecture** | Multi-Tenant SaaS |
| **Primary Actors** | SystemAdmin, Admin, BusManager |
| **Core Entities** | Trip, Round, Bus, TripPassengerAssignment, RoundPassengerAssignment, AttendanceRecord |
| **Key Tech** | NestJS · PostgreSQL · Prisma · React · WebSocket/MQTT |
| **UI Targets** | Admin Desktop Web · BusManager Offline-First PWA |
| **Integration** | Google Sheets Sync · SMS · MS Teams · Telegram (Bot API) |

---

## 2. Core Business Problem

### What This System Is NOT

- ❌ A ticket booking application
- ❌ A tour booking platform
- ❌ A self-service passenger portal

### What This System IS

A **passenger operations management platform** for tourist trips involving multiple buses and multiple journey legs (rounds). It solves a specific and real operational problem: when a group of tourists travels across multiple stops with multiple buses, managing who is on which bus at each leg — and confirming their attendance — becomes extremely difficult with spreadsheets alone.

### Real-World Complexity Addressed

```
Trip: Hanoi → Sapa (3 days)
  ├── Round 1: Hanoi → Rest Stop
  │     ├── Bus A: 30 passengers  (Driver: Nguyen Van A)
  │     └── Bus B: 28 passengers  (Driver: Tran Van B)
  │
  ├── Round 2: Rest Stop → Sapa
  │     ├── Bus A: 25 passengers  (passengers reshuffled at rest stop)
  │     ├── Bus B: 30 passengers  (driver changed)
  │     └── Bus C: 3 passengers   (new bus added for this leg)
  │
  └── Round 3: Sapa → Hanoi (return)
        └── ...
```

The system handles: operational passenger management per round, round-based bus and driver allocation, dynamic passenger reassignment between rounds (at stops), real-time attendance monitoring via WebSocket/MQTT, and multi-tenant data isolation.

---

## 3. System Actors & Roles

### 3.1 SystemAdmin

Global platform administrator. Manages tenants and system-wide configuration. **Not a primary demo actor.**

Permissions: manage tenants (create, suspend, configure), view global data across tenants.

### 3.2 Admin

The primary operational actor. Represents the **trip coordinator or host** within a tenant.

Permissions: full CRUD on trips/rounds/buses, add and import passengers (standalone or via Google Sheets), assign buses to rounds, assign BusManagers to buses per round, move passengers between buses (Admin-only), override any attendance record, view live attendance dashboard, export reports.

### 3.3 BusManager (Driver)

The driver assigned to a specific bus in a specific round.

Permissions: view assigned round and bus, view passenger list for their bus, update round status (`PLANNED → IN_PROGRESS → DONE`), mark passenger attendance (`JOIN` / `ABSENT`). **Cannot** move passengers between buses.

### 3.4 Passenger

**Not a system actor.** No login, no account, no system permissions. A passenger is purely **operational trip data** — a snapshot record attached to a trip.

---

## 4. Multi-Tenant Architecture

A **Tenant** represents an operational unit (tour company, transport operator, event organizer). Each tenant owns its own users, trips, buses, rounds, and passenger data. Cross-tenant data access returns HTTP 403.

**Role Isolation Rule:** A user cannot hold roles in multiple tenants simultaneously.

---

## 5. Core Domain Model

### 5.1 Trip

Top-level entity for a complete tourist journey.

```
Trip { id, tenantId, name (no "/" allowed), startDate, endDate, status (derived), description }
```

### 5.2 Round

A single journey leg — the **atomic unit of operations**.

```
Round { id, tripId, tenantId, name, departurePoint, arrivalPoint,
        scheduledDeparture, scheduledArrival,
        status: PLANNED | IN_PROGRESS | DONE | CANCELLED, sequence }
```

Each Round independently manages its own bus assignments, driver assignments, passenger allocation, and attendance records.

### 5.3 Bus

```
Bus { id, tenantId, licensePlate, name, capacity,
      photoFront, photoSide, photoRear,   // all 3 required — accounting evidence
      metadata }
```

**Bus photos (front/side/rear) are mandatory** — used for payment verification by the finance team.

### 5.4 RoundBusAssignment

The bridge entity connecting a Bus to a specific Round.

```
RoundBusAssignment { PK: (tripId, roundId, busId), tenantId, operationalStatus }
```

> ⚠️ **Critical Rule:** Buses are assigned to **Rounds**, NOT to Trips.

### 5.5 BusManagerAssignment

Links exactly one BusManager (driver) to one Bus in one Round.

```
BusManagerAssignment { id, roundBusAssignment → (tripId, roundId, busId), userId, assignedAt }
```

### 5.6 TripPassengerAssignment

The passenger roster for a Trip. **No global Passenger master table exists.**

```
TripPassengerAssignment { id, tripId, tenantId,
                          name, phone, idCard,
                          type,    // free-text: "KTMT", "KHMT", "CGC", etc.
                          note,    // admin-editable
                          metadata }
```

### 5.7 RoundPassengerAssignment

Tracks which bus a passenger is allocated to in a specific round.

```
RoundPassengerAssignment { id, tripPassengerAssignmentId,
                           roundBusAssignment → (tripId, roundId, busId) }
```

Passenger movement between buses occurs **only at round boundaries** (at stops), and is **Admin-only**.

### 5.8 AttendanceRecord

One record per passenger per round.

```
AttendanceRecord { id, roundPassengerAssignmentId,
                   status: JOIN | ABSENT | CANCELLED,
                   markedAt, markedBy, note }
```

---

## 6. Key Domain Rules (Locked)

| Rule | Detail |
|------|--------|
| **Bus → Round (not Trip)** | Enables per-leg bus and driver changes |
| **1 BusManager per Bus per Round** | Driver can change between rounds |
| **No global Passenger entity** | Passengers are trip-scoped snapshot data |
| **Passenger movement = Admin only** | BusManager cannot move passengers between buses |
| **Movement between rounds only** | No mid-round transfer (operationally impossible) |
| **1 AttendanceRecord per passenger per round** | Scoped to the round |
| **Capacity warning on assignment** | Warn (not block) when bus assignment exceeds capacity |
| **Round cancel → cascade** | Sets all AttendanceRecords in that round to `CANCELLED` |
| **Trip status = derived** | Computed from Round statuses — not stored independently |
| **Trip name no slash** | Trip names may not contain `/` (validation rule) |

---

## 7. Feature Specification

### 7.1 Bus Photo Management

Three photos required per bus: **front**, **side**, **rear**. Purpose: accounting evidence for payment verification.

### 7.2 Trip Date Highlighting

Admin UI highlights trip cards by proximity to current date: **approaching** (amber) and **active today** (green), with a suggestion to update trip status.

### 7.3 Passenger Registration — Two Modes

**Mode 1 — Standalone:** Admin manually enters passenger data via UI.

**Mode 2 — Google Sheet Sync:**
- Sub-mode A: System creates a blank Google Sheet with correct columns → Admin fills → manual sync trigger.
- Sub-mode B: Admin pastes a link to an existing sheet → system maps columns by header name → imports data.

Both modes use a manual "Sync" button trigger.

### 7.4 Passenger Type Field

`TripPassengerAssignment.type` is a free-text field for group/department labels. Examples: `KTMT`, `KHMT`, `CGC`. No fixed enum.

### 7.5 Real-Time Attendance (WebSocket/MQTT)

BusManager attendance updates broadcast in real-time to Admin dashboard and other connected BusManagers on the same trip.

### 7.6 Passenger Notification Channels

- **SMS** — text message to passenger phone
- **Microsoft Teams** — Teams message
- **Telegram** — Bot API (free, no business license required)
- **Broadcast call** — trigger call to all passengers signaling boarding

### 7.7 Voice Attendance (Optional — Post-MVP)

BusManager calls out a passenger name/code; system marks attendance via speech recognition. Deferred due to noise accuracy concerns.

### 7.8 Google Sheets Export

Attendance and passenger data exportable to xlsx for accounting team. Finance workflow remains spreadsheet-based by design.

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│  Admin Web (React + Vite + TS)    BusManager PWA        │
│  Desktop-first                    Mobile-first           │
│  Full operational control         Offline-first          │
│                                   Service Worker + sync  │
└──────────────┬──────────────────────────┬───────────────┘
               │ REST API                 │ WebSocket/MQTT
               ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER (NestJS)                    │
│  Auth · Tenant Guard · RBAC · Trip · Round · Bus        │
│  Passenger · Assignment · Attendance · Notification     │
└──────────────┬──────────────────────────────────────────┘
               │ Prisma ORM
               ▼
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER (PostgreSQL)                  │
│  Tenants · Users · Trips · Rounds · Buses               │
│  RoundBusAssignment · BusManagerAssignment              │
│  TripPassengerAssignment · RoundPassengerAssignment     │
│  AttendanceRecord                                        │
└─────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                       │
│  Google Sheets API · SMS Gateway · MS Teams API         │
│  Telegram Bot API · MQTT Broker · xlsx export           │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns

| Pattern | Purpose |
|---------|---------|
| **Multi-Tenant Guard** | Enforce tenant isolation on every request |
| **RBAC Guard** | Role-based access control per route |
| **Repository (Prisma service)** | Decouple data access from business logic |
| **Event Emitter** | Trigger WebSocket broadcast on attendance change |
| **Strategy Pattern** | Swap between Google Sheet import sub-modes |

---

## 9. Database Design (ERD)

### Core Relationships

```
Tenant ──< User
Tenant ──< Trip ──< Round ──< RoundBusAssignment >── Bus
                                    │
                            BusManagerAssignment >── User (BusManager)

Trip ──< TripPassengerAssignment
              │
              └──< RoundPassengerAssignment >── RoundBusAssignment
                          │
                          └── AttendanceRecord
```

### Key Design Decisions

**No Global Passenger Entity** — `TripPassengerAssignment` is the only passenger storage. Intentional: passengers are operational data, not system users.

**Composite PK on RoundBusAssignment** — `(tripId, roundId, busId)` enforces one assignment per bus per round, while allowing reuse across rounds.

**Trip Status is Derived** — computed from Round states: `PLANNED` (no round started) → `IN_PROGRESS` (first round active) → `DONE` (all rounds done) / `CANCELLED` (all rounds cancelled).

---

## 10. Status & Workflow Design

### Round Status Flow

```
PLANNED ──→ IN_PROGRESS ──→ DONE
    └──────────────────────→ CANCELLED
```

Triggered by BusManager (own round) or Admin (any round).

### AttendanceRecord Status

| Status | Meaning | Set By |
|--------|---------|--------|
| `JOIN` | Passenger was present | BusManager or Admin |
| `ABSENT` | Passenger was not present | BusManager or Admin |
| `CANCELLED` | Round was cancelled | System (cascade) |

### Passenger Movement Rule

Movement is valid **only before a round begins** (at a stop between rounds). Admin reassigns the passenger's `RoundPassengerAssignment` to a different bus. Completed round attendance is unaffected.

---

## 11. UI Structure

### Admin Web (Desktop-Oriented)

- Dashboard with date-aware trip highlighting
- Trip detail: round management, bus assignment, driver assignment, passenger list (with type + notes), passenger allocation per round
- Live attendance dashboard (WebSocket)
- Bus management with 3-photo upload
- Reports and export (xlsx, Google Sheets)

### BusManager PWA (Mobile-First, Offline-First)

- Assigned round with trip context
- Passenger list for assigned bus
- Attendance marking (JOIN / ABSENT)
- Round status update
- Broadcast notification trigger
- Full offline mode via Service Worker; background sync on reconnect

---

## 12. Sprint Roadmap

### Sprint 1 — Authentication, RBAC, and Tenant Isolation ✅ COMPLETE
JWT auth, roles (SystemAdmin/Admin/BusManager), tenant-scoped authorization, protected routes, tenant isolation verified.

---

### Sprint 2 — Trip and Round Core
Trip CRUD (with `/` validation), Trip date-highlighting UI (approaching/active), Round CRUD with status flow, Trip status derived from Rounds.

---

### Sprint 3 — Bus Management and Driver Assignment
Bus registration with **3 mandatory photos** (front/side/rear), capacity metadata, `RoundBusAssignment` (bus → round), `BusManagerAssignment` (1 driver per bus per round).

---

### Sprint 4 — Trip Passenger Registration
Standalone passenger entry, `type` column (free-text), passenger notes, Google Sheet Sync (Mode A: system-generated sheet; Mode B: admin-provided link with column mapping), xlsx export.

---

### Sprint 5 — Round Passenger Allocation
`RoundPassengerAssignment` creation, capacity warning on over-assignment, Admin-only passenger movement between buses, movement boundary rule enforcement.

---

### Sprint 6 — Attendance and Operational Notes
`AttendanceRecord` CRUD, BusManager marks JOIN/ABSENT, round cancellation cascade, Admin override, operational notes (passenger-level and round-level).

---

### Sprint 7 — Real-Time Monitoring and Dashboard
WebSocket/MQTT integration, live Admin attendance dashboard (per-bus, per-round), BusManager PWA receives real-time cross-bus updates, trip/round progress summary.

---

### Sprint 8 — Notifications and External Integrations
SMS to passengers, Microsoft Teams integration, Telegram messaging, broadcast call feature, Google Sheets export for accounting.

---

### Sprint 9 — Offline PWA, Testing, and Deployment
BusManager PWA offline-first (Service Worker + background sync), unit/integration/system/regression/smoke testing, technical documentation, demo preparation.

---

## 13. What Makes This Project Special

**Round-Based Operational Model** — Every operational action is scoped to a Round, not just a Trip. This mirrors real-world tour operations where each leg is independently managed.

**Dynamic Allocation** — Buses, drivers, and passengers can all change between rounds. The system tracks this as a first-class domain concept.

**Passenger as Data, Not Entity** — The deliberate absence of a global Passenger master table simplifies the domain and avoids unnecessary user management complexity for one-time participants.

**Multi-Tenant SaaS** — Built for multiple tour operators to use independently with full data isolation.

**Offline-First PWA** — Drivers operate in areas with poor connectivity. The PWA works fully offline and synchronizes when reconnected.

**Real-Time Coordination** — WebSocket/MQTT enables live visibility across the Admin dashboard and all BusManager PWAs simultaneously.

---

*Report compiled: May 2026 — Source of Truth: Tổng_hợp_toàn_bộ_dự_án.txt + confirmed domain decisions*
