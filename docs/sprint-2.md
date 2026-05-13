# Sprint 2 — Trip & Round Core

## Goal
Implement Trip and Round as the operational backbone of the system.
Both backend API and frontend state management (RTK Query).

Success criteria:
- Admin can create/read/update/delete trips and rounds via API
- Trip.status is DERIVED — computed from round statuses, never stored directly
- Trip name validation rejects "/" character
- Round status flow enforced: PLANNED → IN_PROGRESS → DONE | CANCELLED
- Round cancellation cascades AttendanceRecords (hook prepared)
- Trip date-highlight logic in frontend
- All unit + E2E tests pass

## Read first
Read `CLAUDE.md`. All domain rules apply. Follow Karpathy guidelines.

## Branch
```bash
git checkout develop
git checkout -b sprint/sprint-2-trip-round
```

---

## BACKEND — apps/api

### Step 1 — TripModule scaffold

```bash
cd apps/api
npx nest generate module modules/trip --no-spec
npx nest generate controller modules/trip --no-spec
npx nest generate service modules/trip --no-spec
```

---

### Step 2 — Trip DTOs

Create `apps/api/src/modules/trip/dto/create-trip.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsDateString, IsOptional, Matches } from 'class-validator'

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/]*$/, { message: 'Trip name must not contain "/"' })
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  startDate: string

  @IsDateString()
  endDate: string
}
```

Create `apps/api/src/modules/trip/dto/update-trip.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types'
import { CreateTripDto } from './create-trip.dto'

export class UpdateTripDto extends PartialType(CreateTripDto) {}
```

---

### Step 3 — Trip service

Create `apps/api/src/modules/trip/trip.service.ts`:

Key rules to implement:
1. `findAll(tenantId)` — return trips with derived status
2. `create(tenantId, dto)` — validate name has no "/"
3. `update(id, tenantId, dto)` — tenant-scoped
4. `remove(id, tenantId)` — tenant-scoped
5. `deriveTripStatus(tripId)` — compute status from rounds:
   - No rounds → PLANNED
   - Any round IN_PROGRESS → IN_PROGRESS
   - All rounds DONE → DONE
   - All rounds CANCELLED → CANCELLED
   - Mix of DONE + CANCELLED → DONE

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { TripStatus, RoundStatus } from '@pms/shared'

@Injectable()
export class TripService {
  constructor(private prisma: PrismaService) {}

  async deriveTripStatus(tripId: string): Promise<TripStatus> {
    const rounds = await this.prisma.round.findMany({
      where: { tripId },
      select: { status: true },
    })

    if (rounds.length === 0) return TripStatus.PLANNED

    const statuses = rounds.map((r) => r.status)

    if (statuses.some((s) => s === RoundStatus.IN_PROGRESS)) return TripStatus.IN_PROGRESS
    if (statuses.every((s) => s === RoundStatus.CANCELLED)) return TripStatus.CANCELLED
    if (statuses.every((s) => s === RoundStatus.DONE || s === RoundStatus.CANCELLED)) return TripStatus.DONE
    return TripStatus.PLANNED
  }

  async findAll(tenantId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { tenantId },
      orderBy: { startDate: 'asc' },
      include: { rounds: { select: { status: true } } },
    })

    return Promise.all(
      trips.map(async (trip) => ({
        ...trip,
        status: await this.deriveTripStatus(trip.id),
      })),
    )
  }

  async findOne(id: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, tenantId },
      include: { rounds: { orderBy: { sequence: 'asc' } } },
    })
    if (!trip) throw new NotFoundException('Trip not found')

    return { ...trip, status: await this.deriveTripStatus(id) }
  }

  async create(tenantId: string, dto: CreateTripDto) {
    if (dto.name.includes('/')) {
      throw new BadRequestException('Trip name must not contain "/"')
    }
    return this.prisma.trip.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'PLANNED',
      },
    })
  }

  async update(id: string, tenantId: string, dto: UpdateTripDto) {
    await this.findOne(id, tenantId)
    if (dto.name?.includes('/')) {
      throw new BadRequestException('Trip name must not contain "/"')
    }
    return this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.trip.delete({ where: { id } })
  }
}
```

---

### Step 4 — Trip controller

Create `apps/api/src/modules/trip/trip.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { TripService } from './trip.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role } from '@pms/shared'
import { JwtPayload } from '@pms/shared'

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.tripService.findAll(user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tripService.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTripDto, @CurrentUser() user: JwtPayload) {
    return this.tripService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tripService.update(id, user.tenantId, dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tripService.remove(id, user.tenantId)
  }
}
```

Register TripModule in AppModule.

---

### Step 5 — RoundModule scaffold

```bash
npx nest generate module modules/round --no-spec
npx nest generate controller modules/round --no-spec
npx nest generate service modules/round --no-spec
```

Create `apps/api/src/modules/round/dto/create-round.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsInt, IsDateString, Min } from 'class-validator'

export class CreateRoundDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsInt()
  @Min(1)
  sequence: number

  @IsString()
  @IsNotEmpty()
  departurePoint: string

  @IsString()
  @IsNotEmpty()
  arrivalPoint: string

  @IsDateString()
  scheduledDep: string

  @IsDateString()
  scheduledArr: string
}
```

Create `apps/api/src/modules/round/dto/update-round-status.dto.ts`:
```typescript
import { IsEnum } from 'class-validator'
import { RoundStatus } from '@pms/shared'

export class UpdateRoundStatusDto {
  @IsEnum(RoundStatus)
  status: RoundStatus
}
```

---

### Step 6 — Round service

Create `apps/api/src/modules/round/round.service.ts`:

Key rules:
1. Round belongs to a Trip — always validate trip exists and belongs to tenant
2. Status transitions: PLANNED→IN_PROGRESS→DONE, any→CANCELLED
3. Only Admin or BusManager (own round) can update status
4. Round CANCELLED → cascade ALL AttendanceRecords to CANCELLED

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRoundDto } from './dto/create-round.dto'
import { UpdateRoundStatusDto } from './dto/update-round-status.dto'
import { RoundStatus, Role, JwtPayload } from '@pms/shared'

@Injectable()
export class RoundService {
  constructor(private prisma: PrismaService) {}

  async findAllByTrip(tripId: string, tenantId: string) {
    // Verify trip belongs to tenant
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')

    return this.prisma.round.findMany({
      where: { tripId, tenantId },
      orderBy: { sequence: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')
    return round
  }

  async create(tripId: string, tenantId: string, dto: CreateRoundDto) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')

    // Check sequence uniqueness within trip
    const existing = await this.prisma.round.findUnique({
      where: { tripId_sequence: { tripId, sequence: dto.sequence } },
    })
    if (existing) throw new BadRequestException(`Sequence ${dto.sequence} already exists in this trip`)

    return this.prisma.round.create({
      data: {
        tripId,
        tenantId,
        name: dto.name,
        sequence: dto.sequence,
        departurePoint: dto.departurePoint,
        arrivalPoint: dto.arrivalPoint,
        scheduledDep: new Date(dto.scheduledDep),
        scheduledArr: new Date(dto.scheduledArr),
        status: RoundStatus.PLANNED,
      },
    })
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateRoundStatusDto, user: JwtPayload) {
    const round = await this.findOne(id, tenantId)

    // BusManager can only update their own assigned round
    if (user.role === Role.BUS_MANAGER) {
      const assignment = await this.prisma.busManagerAssignment.findFirst({
        where: { roundId: id, userId: user.userId },
      })
      if (!assignment) {
        throw new ForbiddenException('BusManager can only update their own assigned round')
      }
    }

    // Validate status transition
    this.validateStatusTransition(round.status as RoundStatus, dto.status)

    // Update round status
    const updated = await this.prisma.round.update({
      where: { id },
      data: { status: dto.status },
    })

    // CASCADE: if cancelled → update all AttendanceRecords
    if (dto.status === RoundStatus.CANCELLED) {
      await this.cascanceCancelAttendance(id)
    }

    return updated
  }

  private validateStatusTransition(current: RoundStatus, next: RoundStatus) {
    const allowed: Record<RoundStatus, RoundStatus[]> = {
      [RoundStatus.PLANNED]: [RoundStatus.IN_PROGRESS, RoundStatus.CANCELLED],
      [RoundStatus.IN_PROGRESS]: [RoundStatus.DONE, RoundStatus.CANCELLED],
      [RoundStatus.DONE]: [],
      [RoundStatus.CANCELLED]: [],
    }
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition round from ${current} to ${next}`,
      )
    }
  }

  private async cascanceCancelAttendance(roundId: string) {
    // Get all RoundPassengerAssignments for this round
    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: {
        roundBusAssignment: { roundId },
      },
      select: { id: true },
    })

    if (rpas.length === 0) return

    // Update all AttendanceRecords to CANCELLED
    await this.prisma.attendanceRecord.updateMany({
      where: {
        roundPassengerAssignmentId: { in: rpas.map((r) => r.id) },
      },
      data: { status: 'CANCELLED' },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.round.delete({ where: { id } })
  }
}
```

---

### Step 7 — Round controller

Create `apps/api/src/modules/round/round.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { RoundService } from './round.service'
import { CreateRoundDto } from './dto/create-round.dto'
import { UpdateRoundStatusDto } from './dto/update-round-status.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds')
export class RoundController {
  constructor(private roundService: RoundService) {}

  @Get()
  findAll(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.findAllByTrip(tripId, user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Param('tripId') tripId: string,
    @Body() dto: CreateRoundDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundService.create(tripId, user.tenantId, dto)
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoundStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundService.updateStatus(id, user.tenantId, dto, user)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.remove(id, user.tenantId)
  }
}
```

Register RoundModule in AppModule.

---

### Step 8 — E2E tests

Create `apps/api/test/trip.e2e-spec.ts`:

```typescript
import * as request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'

describe('Trips (e2e)', () => {
  let app: INestApplication
  let adminToken: string
  let busManagerToken: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = adminRes.body.accessToken

    const bmRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'driver@demo.com', password: 'password123' })
    busManagerToken = bmRes.body.accessToken
  })

  afterAll(() => app.close())

  describe('POST /trips', () => {
    it('Admin creates trip → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hanoi to Sapa',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
        })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Hanoi to Sapa')
    })

    it('Trip name with "/" → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hanoi/Sapa',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
        })
      expect(res.status).toBe(400)
    })

    it('BusManager cannot create trip → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({
          name: 'Test Trip',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
        })
      expect(res.status).toBe(403)
    })
  })

  describe('Trip status derivation', () => {
    it('New trip with no rounds → status PLANNED', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Status Test Trip', startDate: '2026-07-01', endDate: '2026-07-03' })

      const tripId = createRes.body.id

      const getRes = await request(app.getHttpServer())
        .get(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(getRes.body.status).toBe('PLANNED')
    })
  })

  describe('Round status transitions', () => {
    let tripId: string
    let roundId: string

    beforeAll(async () => {
      const tripRes = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Round Test Trip', startDate: '2026-08-01', endDate: '2026-08-02' })
      tripId = tripRes.body.id

      const roundRes = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Leg 1',
          sequence: 1,
          departurePoint: 'Hanoi',
          arrivalPoint: 'Rest Stop',
          scheduledDep: '2026-08-01T08:00:00Z',
          scheduledArr: '2026-08-01T12:00:00Z',
        })
      roundId = roundRes.body.id
    })

    it('PLANNED → IN_PROGRESS → valid', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'IN_PROGRESS' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('IN_PROGRESS')
    })

    it('IN_PROGRESS → PLANNED → invalid (400)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PLANNED' })
      expect(res.status).toBe(400)
    })

    it('IN_PROGRESS → DONE → valid', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DONE' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('DONE')
    })

    it('Trip with all rounds DONE → derived status DONE', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.body.status).toBe('DONE')
    })
  })
})
```

Run:
```bash
cd apps/api
pnpm test:e2e
```

All tests must pass.

---

## FRONTEND — apps/web

### Step 9 — RTK base setup

Create `apps/web/src/store/index.ts`:
```typescript
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './baseApi'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

Create `apps/web/src/store/baseApi.ts`:
```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './index'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Trip', 'Round'],
  endpoints: () => ({}),
})
```

Create `apps/web/src/store/hooks.ts`:
```typescript
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector)
```

---

### Step 10 — Auth slice

Create `apps/web/src/features/auth/authSlice.ts`:
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  accessToken: string | null
  userId: string | null
  tenantId: string | null
  role: string | null
  name: string | null
}

const initialState: AuthState = {
  accessToken: localStorage.getItem('accessToken'),
  userId: localStorage.getItem('userId'),
  tenantId: localStorage.getItem('tenantId'),
  role: localStorage.getItem('role'),
  name: localStorage.getItem('name'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthState>) {
      Object.assign(state, action.payload)
      localStorage.setItem('accessToken', action.payload.accessToken ?? '')
      localStorage.setItem('userId', action.payload.userId ?? '')
      localStorage.setItem('tenantId', action.payload.tenantId ?? '')
      localStorage.setItem('role', action.payload.role ?? '')
      localStorage.setItem('name', action.payload.name ?? '')
    },
    logout(state) {
      Object.assign(state, { accessToken: null, userId: null, tenantId: null, role: null, name: null })
      localStorage.clear()
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
```

---

### Step 11 — Trip API (RTK Query)

Create `apps/web/src/features/trips/tripsApi.ts`:
```typescript
import { baseApi } from '../../store/baseApi'
import type { Trip } from '@pms/shared'

interface CreateTripPayload {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export const tripsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrips: builder.query<Trip[], void>({
      query: () => '/trips',
      providesTags: ['Trip'],
    }),
    getTrip: builder.query<Trip, string>({
      query: (id) => `/trips/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Trip', id }],
    }),
    createTrip: builder.mutation<Trip, CreateTripPayload>({
      query: (body) => ({ url: '/trips', method: 'POST', body }),
      invalidatesTags: ['Trip'],
    }),
    updateTrip: builder.mutation<Trip, { id: string; body: Partial<CreateTripPayload> }>({
      query: ({ id, body }) => ({ url: `/trips/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Trip'],
    }),
    deleteTrip: builder.mutation<void, string>({
      query: (id) => ({ url: `/trips/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Trip'],
    }),
  }),
})

export const {
  useGetTripsQuery,
  useGetTripQuery,
  useCreateTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation,
} = tripsApi
```

---

### Step 12 — Trip date highlight utility

Create `apps/web/src/features/trips/tripUtils.ts`:
```typescript
import { TripStatus } from '@pms/shared'

export type TripHighlight = 'approaching' | 'active' | 'normal' | 'done' | 'cancelled'

/**
 * Returns a CSS highlight class based on trip date proximity.
 * - 'active'     → startDate <= today <= endDate (amber-green highlight)
 * - 'approaching' → startDate within 3 days from today (amber highlight)
 * - 'done'       → trip is done
 * - 'cancelled'  → trip is cancelled
 * - 'normal'     → default
 */
export function getTripHighlight(
  startDate: string | Date,
  endDate: string | Date,
  status: TripStatus,
): TripHighlight {
  if (status === TripStatus.DONE) return 'done'
  if (status === TripStatus.CANCELLED) return 'cancelled'

  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Active: today is within trip window
  if (now >= start && now <= end) return 'active'

  // Approaching: starts within 3 days
  const diffMs = start.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays >= 0 && diffDays <= 3) return 'approaching'

  return 'normal'
}

export const TRIP_HIGHLIGHT_CLASSES: Record<TripHighlight, string> = {
  active: 'border-l-4 border-green-500 bg-green-50',
  approaching: 'border-l-4 border-amber-400 bg-amber-50',
  done: 'opacity-60 bg-gray-50',
  cancelled: 'opacity-40 bg-red-50',
  normal: 'bg-white',
}
```

---

### Step 13 — apps/web .env

Create `apps/web/.env`:
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8083
```

---

### Step 14 — Verify frontend builds

```bash
pnpm --filter web build
pnpm --filter pwa build
```

Both must pass with zero TypeScript errors.

---

## Step 15 — Final verification

```bash
# Run all API tests
cd apps/api && pnpm test:e2e

# Build all packages
cd ~/thesis/passenger-management-system
pnpm build

# Quick smoke test with running server
cd apps/api && pnpm dev &
sleep 3

# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}' | jq -r .accessToken)

# Create trip
curl -s -X POST http://localhost:3000/trips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hanoi to Sapa","startDate":"2026-06-01","endDate":"2026-06-03"}' | jq .

# Trip name with slash → should 400
curl -s -X POST http://localhost:3000/trips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hanoi/Sapa","startDate":"2026-06-01","endDate":"2026-06-03"}' | jq .status

kill %1
```

---

## Step 16 — Commit and merge

```bash
cd ~/thesis/passenger-management-system
git add .
git commit -m "feat(sprint2): trip + round CRUD, derived status, date-highlight utils, RTK Query setup"
git push origin sprint/sprint-2-trip-round

git checkout develop
git merge sprint/sprint-2-trip-round
git push origin develop
```

Update CLAUDE.md sprint table — Sprint 2: ✅ DONE

---

## Success Criteria Checklist
- [ ] GET /trips → list with derived status per trip
- [ ] POST /trips with "/" in name → 400
- [ ] POST /trips by BusManager → 403
- [ ] Round PLANNED → IN_PROGRESS → DONE (valid)
- [ ] Round IN_PROGRESS → PLANNED (invalid → 400)
- [ ] Trip with all rounds DONE → derived status DONE
- [ ] Round CANCELLED → AttendanceRecords cascade (hook ready)
- [ ] tripUtils.getTripHighlight() returns correct highlight class
- [ ] pnpm build → zero TypeScript errors (all 4 packages)
- [ ] All E2E tests pass
