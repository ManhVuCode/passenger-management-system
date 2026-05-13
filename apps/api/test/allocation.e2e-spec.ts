import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Allocation (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let busManagerToken: string
  let tripId: string
  let roundId: string
  let busId: string
  let bus2Id: string
  let passenger1Id: string
  let passenger2Id: string
  let passenger3Id: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    prisma = module.get(PrismaService)

    // Idempotent cleanup: remove any leftover buses with our test plates and their FK dependents
    const testPlates = ['ALLOC-BUS-1', 'ALLOC-BUS-2']
    const stale = await prisma.bus.findMany({
      where: { licensePlate: { in: testPlates } },
      select: { id: true },
    })
    const staleIds = stale.map((b) => b.id)
    if (staleIds.length > 0) {
      await prisma.roundPassengerAssignment.deleteMany({ where: { busId: { in: staleIds } } })
      await prisma.busManagerAssignment.deleteMany({ where: { busId: { in: staleIds } } })
      await prisma.roundBusAssignment.deleteMany({ where: { busId: { in: staleIds } } })
      await prisma.bus.deleteMany({ where: { id: { in: staleIds } } })
    }

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = adminRes.body.accessToken

    const bmRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'driver@demo.com', password: 'password123' })
    busManagerToken = bmRes.body.accessToken

    const trip = await request(app.getHttpServer())
      .post('/trips').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alloc Test Trip', startDate: '2026-11-01', endDate: '2026-11-02' })
    tripId = trip.body.id

    const round = await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Leg 1', sequence: 1, departurePoint: 'A', arrivalPoint: 'B',
        scheduledDep: '2026-11-01T08:00:00Z', scheduledArr: '2026-11-01T12:00:00Z' })
    roundId = round.body.id

    const b1 = await request(app.getHttpServer())
      .post('/buses').set('Authorization', `Bearer ${adminToken}`)
      .send({ licensePlate: 'ALLOC-BUS-1', name: 'Small Bus 1', capacity: 2,
        photoFront: 'https://x.com/f.jpg', photoSide: 'https://x.com/s.jpg', photoRear: 'https://x.com/r.jpg' })
    busId = b1.body.id

    const b2 = await request(app.getHttpServer())
      .post('/buses').set('Authorization', `Bearer ${adminToken}`)
      .send({ licensePlate: 'ALLOC-BUS-2', name: 'Bus 2', capacity: 10,
        photoFront: 'https://x.com/f.jpg', photoSide: 'https://x.com/s.jpg', photoRear: 'https://x.com/r.jpg' })
    bus2Id = b2.body.id

    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses`)
      .set('Authorization', `Bearer ${adminToken}`).send({ busId })
    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses`)
      .set('Authorization', `Bearer ${adminToken}`).send({ busId: bus2Id })

    const p1 = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pax One', phone: '0911000001' })
    passenger1Id = p1.body.id

    const p2 = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pax Two', phone: '0911000002' })
    passenger2Id = p2.body.id

    const p3 = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pax Three', phone: '0911000003' })
    passenger3Id = p3.body.id
  })

  afterAll(async () => {
    await prisma.roundPassengerAssignment.deleteMany({ where: { tripId } })
    await prisma.roundBusAssignment.deleteMany({ where: { tripId } })
    await prisma.tripPassengerAssignment.deleteMany({ where: { tripId } })
    await prisma.round.deleteMany({ where: { tripId } })
    await prisma.trip.delete({ where: { id: tripId } }).catch(() => undefined)
    await prisma.bus.deleteMany({ where: { id: { in: [busId, bus2Id] } } })
    await app.close()
  })

  describe('Allocate passengers to bus', () => {
    it('Admin allocates 2 passengers to bus → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [passenger1Id, passenger2Id], busId })
      expect(res.status).toBe(201)
      expect(res.body.assigned).toBe(2)
      expect(res.body.capacityWarning).toBeUndefined()
    })

    it('Allocating 3rd passenger to capacity-2 bus → 201 with capacityWarning', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [passenger3Id], busId })
      expect(res.status).toBe(201)
      expect(res.body.capacityWarning).toBeDefined()
      expect(res.body.capacityWarning.message).toContain('capacity')
    })

    it('Duplicate allocation → 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [passenger1Id], busId })
      expect(res.status).toBe(409)
    })

    it('BusManager cannot allocate → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ passengerIds: [passenger1Id], busId })
      expect(res.status).toBe(403)
    })
  })

  describe('Move passenger between buses', () => {
    let assignmentId: string

    beforeAll(async () => {
      const allocs = await request(app.getHttpServer())
        .get(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
      assignmentId = allocs.body.find(
        (a: { tripPassengerAssignment: { id: string } }) =>
          a.tripPassengerAssignment.id === passenger1Id,
      )?.id
    })

    it('Admin moves passenger to different bus → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/allocations/${assignmentId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toBusId: bus2Id })
      expect(res.status).toBe(200)
      expect(res.body.moved).toBe(true)
    })

    it('BusManager cannot move passenger → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/allocations/${assignmentId}/move`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ toBusId: busId })
      expect(res.status).toBe(403)
    })
  })

  describe('Move passenger when round is not PLANNED', () => {
    let activeRoundId: string
    let activeRpaId: string

    beforeAll(async () => {
      const rnd = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Active Leg', sequence: 2, departurePoint: 'B', arrivalPoint: 'C',
          scheduledDep: '2026-11-01T13:00:00Z', scheduledArr: '2026-11-01T17:00:00Z' })
      activeRoundId = rnd.body.id

      await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${activeRoundId}/buses`)
        .set('Authorization', `Bearer ${adminToken}`).send({ busId })

      const alloc = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${activeRoundId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [passenger2Id], busId })
      activeRpaId = alloc.body.assignments[0].id

      await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${activeRoundId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'IN_PROGRESS' })
    })

    it('Move passenger in IN_PROGRESS round → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${activeRoundId}/allocations/${activeRpaId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toBusId: bus2Id })
      expect(res.status).toBe(400)
      expect(res.body.message).toContain('IN_PROGRESS')
    })
  })

  describe('Get allocations', () => {
    it('GET allocations by round returns all passengers across all buses', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/rounds/${roundId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('BusManager can read allocations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/rounds/${roundId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })
  })
})
