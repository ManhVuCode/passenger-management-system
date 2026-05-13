import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Notifications (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let busManagerToken: string
  let bmUserId: string
  let tripId: string
  let roundId: string
  let busId: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    prisma = module.get(PrismaService)

    const testPlates = ['NOTIF-BUS-01']
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

    const aRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = aRes.body.accessToken

    const bRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'driver@demo.com', password: 'password123' })
    busManagerToken = bRes.body.accessToken
    bmUserId = bRes.body.userId

    const t = await request(app.getHttpServer())
      .post('/trips').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Notify Test Trip', startDate: '2027-01-01', endDate: '2027-01-02' })
    tripId = t.body.id

    const r = await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Notify Leg', sequence: 1, departurePoint: 'A', arrivalPoint: 'B',
        scheduledDep: '2027-01-01T08:00:00Z', scheduledArr: '2027-01-01T12:00:00Z' })
    roundId = r.body.id

    const b = await request(app.getHttpServer())
      .post('/buses').set('Authorization', `Bearer ${adminToken}`)
      .send({ licensePlate: 'NOTIF-BUS-01', name: 'Notify Bus', capacity: 30,
        photoFront: 'https://x.com/f.jpg', photoSide: 'https://x.com/s.jpg',
        photoRear: 'https://x.com/r.jpg' })
    busId = b.body.id

    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses`)
      .set('Authorization', `Bearer ${adminToken}`).send({ busId })

    const p = await request(app.getHttpServer())
      .post(`/trips/${tripId}/passengers`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Notify Pax', phone: '0961000001' })

    await request(app.getHttpServer())
      .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ passengerIds: [p.body.id], busId })
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
    await prisma.bus.deleteMany({ where: { licensePlate: { in: ['NOTIF-BUS-01'] } } })
    await app.close()
  })

  describe('Send notifications (dev mode — no provider keys set)', () => {
    it('SMS → 201, devMode: true, sent: 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/notify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ channel: 'SMS', message: 'Please board the bus' })
      expect(res.status).toBe(201)
      expect(res.body.channel).toBe('SMS')
      expect(res.body.devMode).toBe(true)
      expect(res.body.sent).toBe(1)
    })

    it('TEAMS → 201, devMode: true', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/notify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ channel: 'TEAMS', message: 'Bus departing in 5 minutes' })
      expect(res.status).toBe(201)
      expect(res.body.devMode).toBe(true)
    })

    it('BROADCAST → 201, devMode: true, emits WebSocket event', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/notify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ channel: 'BROADCAST', message: 'All passengers board now' })
      expect(res.status).toBe(201)
      expect(res.body.channel).toBe('BROADCAST')
      expect(res.body.devMode).toBe(true)
    })

    it('Invalid channel → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/notify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ channel: 'WHATSAPP', message: 'Test' })
      expect(res.status).toBe(400)
    })

    it('BusManager cannot send → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/notify`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ channel: 'SMS', message: 'Test' })
      expect(res.status).toBe(403)
    })

    it('Round with no allocated passengers → 404', async () => {
      const emptyRound = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Empty', sequence: 9, departurePoint: 'X', arrivalPoint: 'Y',
          scheduledDep: '2027-01-02T08:00:00Z', scheduledArr: '2027-01-02T12:00:00Z' })
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${emptyRound.body.id}/notify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ channel: 'SMS', message: 'Test' })
      expect(res.status).toBe(404)
    })
  })

  describe('Gap fix: BusManager cannot cancel round', () => {
    it('BusManager PATCH round status CANCELLED → 403', async () => {
      const t2 = await request(app.getHttpServer())
        .post('/trips').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cancel Guard Test', startDate: '2027-02-01', endDate: '2027-02-02' })

      const r2 = await request(app.getHttpServer())
        .post(`/trips/${t2.body.id}/rounds`).set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Leg', sequence: 1, departurePoint: 'A', arrivalPoint: 'B',
          scheduledDep: '2027-02-01T08:00:00Z', scheduledArr: '2027-02-01T12:00:00Z' })

      await request(app.getHttpServer())
        .post(`/trips/${t2.body.id}/rounds/${r2.body.id}/buses`)
        .set('Authorization', `Bearer ${adminToken}`).send({ busId })

      await request(app.getHttpServer())
        .post(`/trips/${t2.body.id}/rounds/${r2.body.id}/buses/${busId}/manager`)
        .set('Authorization', `Bearer ${adminToken}`).send({ userId: bmUserId })

      const res = await request(app.getHttpServer())
        .patch(`/trips/${t2.body.id}/rounds/${r2.body.id}/status`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ status: 'CANCELLED' })
      expect(res.status).toBe(403)

      await prisma.busManagerAssignment.deleteMany({ where: { tripId: t2.body.id } })
      await prisma.roundBusAssignment.deleteMany({ where: { tripId: t2.body.id } })
      await prisma.round.deleteMany({ where: { tripId: t2.body.id } })
      await prisma.trip.delete({ where: { id: t2.body.id } }).catch(() => undefined)
    })
  })
})
