# Sprint 1A — Monorepo Scaffold

## Goal
Scaffold the full monorepo workspace so every package is buildable before writing any business logic.
Success criteria: `pnpm build` passes in all packages with zero TypeScript errors.

## Read first
Read `CLAUDE.md` before doing anything. All domain rules apply.

## Step-by-step plan

### 1. Root workspace config
```
verify: pnpm-workspace.yaml exists with apps/* and packages/*
```

Create root `package.json` with workspaces scripts:
```json
{
  "name": "passenger-management-system",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\" \"pnpm --filter pwa dev\"",
    "build": "pnpm --filter shared build && pnpm --filter api build && pnpm --filter web build && pnpm --filter pwa build",
    "test": "pnpm --filter api test",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed",
    "db:studio": "pnpm --filter api db:studio"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

---

### 2. packages/shared — domain types

Init package:
```bash
cd packages/shared
pnpm init
```

`packages/shared/package.json`:
```json
{
  "name": "@pms/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts` that exports everything.

Create the following files under `packages/shared/src/`:

**enums.ts**
```typescript
export enum Role {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  ADMIN = 'ADMIN',
  BUS_MANAGER = 'BUS_MANAGER',
}

export enum TripStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum RoundStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  JOIN = 'JOIN',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}
```

**types.ts** — all domain entity interfaces:
```typescript
import { Role, TripStatus, RoundStatus, AttendanceStatus, TenantStatus } from './enums'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: Role
  createdAt: Date
}

export interface Trip {
  id: string
  tenantId: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  status: TripStatus
  createdAt: Date
}

export interface Round {
  id: string
  tripId: string
  tenantId: string
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: Date
  scheduledArr: Date
  status: RoundStatus
  createdAt: Date
}

export interface Bus {
  id: string
  tenantId: string
  licensePlate: string
  name: string
  capacity: number
  photoFront: string
  photoSide: string
  photoRear: string
  createdAt: Date
}

export interface TripPassengerAssignment {
  id: string
  tripId: string
  tenantId: string
  name: string
  phone: string
  idCard?: string
  type?: string
  note?: string
  createdAt: Date
}

export interface AttendanceRecord {
  id: string
  roundPassengerAssignmentId: string
  status: AttendanceStatus
  markedBy: string
  markedAt: Date
  note?: string
}
```

**api.ts** — response wrappers:
```typescript
export interface ApiResponse<T> {
  data: T
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  message: string
  statusCode: number
}

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  iat?: number
  exp?: number
}
```

**dtos.ts** — request DTOs:
```typescript
export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponseDto {
  accessToken: string
  userId: string
  tenantId: string
  role: string
  name: string
}

export interface CreateTripDto {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export interface UpdateTripDto {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface CreateRoundDto {
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: string
  scheduledArr: string
}

export interface CreateBusDto {
  licensePlate: string
  name: string
  capacity: number
  photoFront: string
  photoSide: string
  photoRear: string
}
```

Export all from `src/index.ts`.

verify: `pnpm --filter shared build` → no errors

---

### 3. apps/api — NestJS scaffold

```bash
cd apps/api
npx @nestjs/cli new . --package-manager pnpm --skip-git --skip-install
pnpm install
```

Install dependencies:
```bash
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add @prisma/client
pnpm add -D prisma @types/passport-jwt @types/bcrypt @types/jest
pnpm add @pms/shared
```

`apps/api/tsconfig.json` — ensure strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "baseUrl": "."
  }
}
```

`apps/api/package.json` scripts — add:
```json
"db:migrate": "prisma migrate dev",
"db:seed": "ts-node prisma/seed.ts",
"db:studio": "prisma studio",
"db:generate": "prisma generate"
```

Create `apps/api/.env`:
```
DATABASE_URL="postgresql://dev:devpassword@localhost:5432/passenger_mgmt"
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
```

Create `apps/api/.env.example` (same keys, empty values).

---

### 4. apps/api — Prisma schema

Create `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SYSTEM_ADMIN
  ADMIN
  BUS_MANAGER
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
}

enum TripStatus {
  PLANNED
  IN_PROGRESS
  DONE
  CANCELLED
}

enum RoundStatus {
  PLANNED
  IN_PROGRESS
  DONE
  CANCELLED
}

enum AttendanceStatus {
  JOIN
  ABSENT
  CANCELLED
}

model Tenant {
  id        String       @id @default(uuid())
  name      String
  slug      String       @unique
  status    TenantStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  users User[]
  trips Trip[]
  buses Bus[]
  tripPassengerAssignments TripPassengerAssignment[]
}

model User {
  id           String   @id @default(uuid())
  tenantId     String
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  createdAt    DateTime @default(now())

  tenant                Tenant                 @relation(fields: [tenantId], references: [id])
  busManagerAssignments BusManagerAssignment[]
  attendanceRecords     AttendanceRecord[]
}

model Trip {
  id          String     @id @default(uuid())
  tenantId    String
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime
  status      TripStatus @default(PLANNED)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  tenant                   Tenant                    @relation(fields: [tenantId], references: [id])
  rounds                   Round[]
  tripPassengerAssignments TripPassengerAssignment[]
  roundBusAssignments      RoundBusAssignment[]
}

model Round {
  id             String      @id @default(uuid())
  tripId         String
  tenantId       String
  name           String
  sequence       Int
  departurePoint String
  arrivalPoint   String
  scheduledDep   DateTime
  scheduledArr   DateTime
  status         RoundStatus @default(PLANNED)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  trip                Round_Trip              @relation(fields: [tripId], references: [id])
  roundBusAssignments RoundBusAssignment[]

  @@unique([tripId, sequence])
}

// Workaround: use explicit relation name
model Round_Trip {
  id     String  @id @default(uuid())
  tripId String
  trip   Trip    @relation(fields: [tripId], references: [id])
  rounds Round[]

  @@ignore
}

model Bus {
  id           String   @id @default(uuid())
  tenantId     String
  licensePlate String   @unique
  name         String
  capacity     Int
  photoFront   String
  photoSide    String
  photoRear    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant              Tenant               @relation(fields: [tenantId], references: [id])
  roundBusAssignments RoundBusAssignment[]
}

model RoundBusAssignment {
  tripId            String
  roundId           String
  busId             String
  tenantId          String
  operationalStatus String?
  createdAt         DateTime @default(now())

  trip                     Trip                      @relation(fields: [tripId], references: [id])
  round                    Round                     @relation(fields: [roundId], references: [id])
  bus                      Bus                       @relation(fields: [busId], references: [id])
  busManagerAssignment     BusManagerAssignment?
  roundPassengerAssignments RoundPassengerAssignment[]

  @@id([tripId, roundId, busId])
}

model BusManagerAssignment {
  id         String   @id @default(uuid())
  tripId     String
  roundId    String
  busId      String
  userId     String
  assignedAt DateTime @default(now())

  roundBusAssignment RoundBusAssignment @relation(fields: [tripId, roundId, busId], references: [tripId, roundId, busId])
  user               User               @relation(fields: [userId], references: [id])

  @@unique([tripId, roundId, busId])
}

model TripPassengerAssignment {
  id       String  @id @default(uuid())
  tripId   String
  tenantId String
  name     String
  phone    String
  idCard   String?
  type     String?
  note     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  trip                      Trip                       @relation(fields: [tripId], references: [id])
  tenant                    Tenant                     @relation(fields: [tenantId], references: [id])
  roundPassengerAssignments RoundPassengerAssignment[]
}

model RoundPassengerAssignment {
  id                        String   @id @default(uuid())
  tripPassengerAssignmentId String
  tripId                    String
  roundId                   String
  busId                     String
  createdAt                 DateTime @default(now())

  tripPassengerAssignment TripPassengerAssignment @relation(fields: [tripPassengerAssignmentId], references: [id])
  roundBusAssignment      RoundBusAssignment      @relation(fields: [tripId, roundId, busId], references: [tripId, roundId, busId])
  attendanceRecord        AttendanceRecord?
}

model AttendanceRecord {
  id                        String           @id @default(uuid())
  roundPassengerAssignmentId String           @unique
  status                    AttendanceStatus
  markedBy                  String
  markedAt                  DateTime         @default(now())
  note                      String?
  createdAt                 DateTime         @default(now())
  updatedAt                 DateTime         @updatedAt

  roundPassengerAssignment RoundPassengerAssignment @relation(fields: [roundPassengerAssignmentId], references: [id])
  markedByUser             User                     @relation(fields: [markedBy], references: [id])
}
```

Run migration:
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

verify: migration succeeds, `node_modules/.prisma/client` exists

---

### 5. apps/web — React + Vite scaffold

```bash
cd apps/web
pnpm create vite . --template react-ts
pnpm install
pnpm add @reduxjs/toolkit react-redux react-router-dom axios
pnpm add -D @types/react @types/react-dom
pnpm add @pms/shared
```

`apps/web/package.json` name: `"@pms/web"`

verify: `pnpm --filter web build` → no errors

---

### 6. apps/pwa — React + Vite + PWA scaffold

```bash
cd apps/pwa
pnpm create vite . --template react-ts
pnpm install
pnpm add @reduxjs/toolkit react-redux react-router-dom axios
pnpm add vite-plugin-pwa workbox-window
pnpm add -D @types/react @types/react-dom
pnpm add @pms/shared
```

`apps/pwa/package.json` name: `"@pms/pwa"`

`apps/pwa/vite.config.ts` — add PWA plugin:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BusManager PWA',
        short_name: 'BusMgr',
        theme_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/rounds\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'rounds-cache' },
          },
        ],
      },
    }),
  ],
  server: { port: 5174 },
})
```

verify: `pnpm --filter pwa build` → no errors

---

### 7. Final verification

```bash
# From root
pnpm install
pnpm build
```

All 4 packages must build with zero TypeScript errors.

```bash
rtk git status
git add .
git commit -m "feat(sprint1a): scaffold monorepo — shared types, prisma schema, api/web/pwa init"
```

## Report after completion
- List all created files
- Confirm `pnpm build` output (pass/fail per package)
- Confirm Prisma migration status
- Any schema issues encountered and how resolved
