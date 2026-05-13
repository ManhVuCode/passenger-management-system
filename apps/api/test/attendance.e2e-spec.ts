import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Attendance (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let busManagerToken: string
  let bmUserId: string
  let tripId: string
  let roundId: string
  let busId: string
  let rpa1Id: string
  let rpa2Id: string
  let ar1Id: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    prisma = module.get(PrismaService)

    const testPlates = ['ATT-BUS-01', 'ATT-OTHER-BUS']
    const stale = await prisma.bus.findMany({
      where: { licensePlate: { in: testPlates } },
      select: { id: true },
    })
    const staleIds = stale.map((b) => b.id)
    if (staleIds.length > 0) {
      await prisma.attendanceRecord.deleteMany({
        where: { roundPassengerAssignment: { busId: { in: staleIds } } },
      })
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
    bmUserId = bmRes.body.userId

    const trip = await request(app.getHttpServer())
      .post('/trips').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Attendance Test Trip', startDate: '2026-12-01', endDate: '2026-12-02' })
    tripId = trip.body.id

    const round = await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Att Leg 1', sequence: 1, departurePoint: 'A', arrivalPoint: 'B',
        scheduledDep: '2026-12-01T08:00:00Z', scheduledArr: '2026-12-01T12:00:00Z' })
    roundId = round.body.id

    const bus = await request(app.getHttpServer())
      .post('/buses').set('Authorization', `Bearer ${adminToken}`)
      .send({ licensePlate: 'ATT-BUS-01', name: 'Att Bus', capacity: 30,
        photoFront: 'https://x.com/f.jpg', photoSide: 'https://x.com/s.jpg', photoRear: 'https://x.com/r.jpg' })
    busId = bus.body.id

    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses`)
      .set('Authorization', `Bearer ${adminToken}`).send({ busId })

    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/manager`)
      .set('Authorization', `Bearer ${adminToken}`).send({ userId: bmUserId })

    const p1 = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Att Pax 1', phone: '0951000001' })
    const p2 = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Att Pax 2', phone: '0951000002' })

    const alloc = await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ passengerIds: [p1.body.id, p2.body.id], busId })
    rpa1Id = alloc.body.assignments[0].id
    rpa2Id = alloc.body.assignments[1].id
  })

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({
      where: { roundPassengerAssignment: { tripId } },
    })
    await prisma.roundPassengerAssignment.deleteMany({ where: { tripId } })
    await prisma.busManagerAssignment.deleteMany({ where: { tripId } })
    await prisma.roundBusAssignment.deleteMany({ where: { tripId } })
    await prisma.tripPassengerAssignment.deleteMany({ where: { tripId } })
    await prisma.round.deleteMany({ where: { tripId } })
    await prisma.trip.delete({ where: { id: tripId } }).catch(() => undefined)
    await prisma.bus.deleteMany({ where: { licensePlate: { in: ['ATT-BUS-01', 'ATT-OTHER-BUS'] } } })
    await app.close()
  })

  describe('BusManager marks attendance', () => {
    it('BusManager marks passenger JOIN → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ roundPassengerAssignmentIds: [rpa1Id], status: 'JOIN' })
      expect(res.status).toBe(201)
      expect(res.body.marked).toBe(1)
      expect(res.body.status).toBe('JOIN')
      ar1Id = res.body.records[0].id
    })

    it('BusManager marks passenger ABSENT → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ roundPassengerAssignmentIds: [rpa2Id], status: 'ABSENT', note: 'Did not show up' })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('ABSENT')
    })

    it('Marking same passenger again = upsert (idempotent) → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ roundPassengerAssignmentIds: [rpa1Id], status: 'ABSENT' })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('ABSENT')
    })
  })

  describe('BusManager scope enforcement', () => {
    let otherBusId: string
    let otherRpaId: string

    beforeAll(async () => {
      const b = await request(app.getHttpServer())
        .post('/buses').set('Authorization', `Bearer ${adminToken}`)
        .send({ licensePlate: 'ATT-OTHER-BUS', name: 'Other Bus', capacity: 20,
          photoFront: 'https://x.com/f.jpg', photoSide: 'https://x.com/s.jpg', photoRear: 'https://x.com/r.jpg' })
      otherBusId = b.body.id

      await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses`)
        .set('Authorization', `Bearer ${adminToken}`).send({ busId: otherBusId })

      const pOther = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Other Bus Pax', phone: '0951000099' })

      const alloc = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${otherBusId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [pOther.body.id], busId: otherBusId })
      otherRpaId = alloc.body.assignments[0].id
    })

    it('BusManager marks attendance on OTHER bus → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${otherBusId}/attendance`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ roundPassengerAssignmentIds: [otherRpaId], status: 'JOIN' })
      expect(res.status).toBe(403)
    })
  })

  describe('Admin override', () => {
    it('Admin overrides attendance record → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/attendance/${ar1Id}/override`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'JOIN', note: 'Admin correction' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('JOIN')
      expect(res.body.note).toBe('Admin correction')
    })

    it('BusManager cannot override → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/attendance/${ar1Id}/override`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ status: 'ABSENT' })
      expect(res.status).toBe(403)
    })
  })

  describe('Round cancellation cascade', () => {
    it('Round CANCELLED → all AttendanceRecords → CANCELLED', async () => {
      const cancelRound = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cancel Leg', sequence: 3, departurePoint: 'X', arrivalPoint: 'Y',
          scheduledDep: '2026-12-02T08:00:00Z', scheduledArr: '2026-12-02T12:00:00Z' })
      const crId = cancelRound.body.id

      await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${crId}/buses`)
        .set('Authorization', `Bearer ${adminToken}`).send({ busId })

      const pC = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cancel Pax', phone: '0951000088' })

      const allocC = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${crId}/buses/${busId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengerIds: [pC.body.id], busId })
      const crpaId = allocC.body.assignments[0].id

      await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${crId}/buses/${busId}/attendance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roundPassengerAssignmentIds: [crpaId], status: 'JOIN' })

      await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${crId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })

      const record = await prisma.attendanceRecord.findFirst({
        where: { roundPassengerAssignmentId: crpaId },
      })
      expect(record?.status).toBe('CANCELLED')
    })
  })

  describe('Attendance summary', () => {
    it('GET summary → totals by status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/rounds/${roundId}/attendance/summary`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.total).toBeGreaterThan(0)
      expect(typeof res.body.join).toBe('number')
      expect(typeof res.body.absent).toBe('number')
      expect(typeof res.body.pending).toBe('number')
    })
  })

  describe('Round operational note', () => {
    it('Admin sets round note → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Bus delayed 15 minutes at stop' })
      expect(res.status).toBe(200)
      expect(res.body.operationalNote).toBe('Bus delayed 15 minutes at stop')
    })

    it('BusManager cannot set round note → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/rounds/${roundId}/note`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ note: 'Should fail' })
      expect(res.status).toBe(403)
    })
  })

  describe('My assignments', () => {
    it('BusManager gets their assignments', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/assignments')
        .set('Authorization', `Bearer ${busManagerToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const target = res.body.find((a: { id: string }) => a.id === roundId)
      expect(target).toBeDefined()
      expect(target.busId).toBe(busId)
    })
  })
})
