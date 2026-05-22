import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

const MOCK_PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('Bus & Assignment (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let busManagerToken: string
  let busId: string
  let tripId: string
  let roundId: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    prisma = app.get(PrismaService)
    const testPlates = ['51A-123.45', '51B-999.99', '51C-111.11']
    const existing = await prisma.bus.findMany({
      where: { licensePlate: { in: testPlates } },
      select: { id: true },
    })
    const existingIds = existing.map((b) => b.id)
    if (existingIds.length > 0) {
      await prisma.busManagerAssignment.deleteMany({ where: { busId: { in: existingIds } } })
      await prisma.roundPassengerAssignment.deleteMany({
        where: {
          roundBusAssignment: {
            busId: { in: existingIds },
          },
        },
      })
      await prisma.roundBusAssignment.deleteMany({ where: { busId: { in: existingIds } } })
      await prisma.bus.deleteMany({ where: { id: { in: existingIds } } })
    }

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = adminRes.body.accessToken

    const bmRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'driver@demo.com', password: 'password123' })
    busManagerToken = bmRes.body.accessToken
  })

  afterAll(() => app.close())

  describe('Bus CRUD', () => {
    it('Admin creates bus with 3 photos → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlate: '51A-123.45',
          name: 'Bus Alpha',
          capacity: 30,
          photoFront: MOCK_PHOTO,
          photoSide: MOCK_PHOTO,
          photoRear: MOCK_PHOTO,
        })
      expect(res.status).toBe(201)
      expect(res.body.photoFront).toBeDefined()
      busId = res.body.id
    })

    it('Duplicate license plate → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlate: '51A-123.45',
          name: 'Bus Beta',
          capacity: 20,
          photoFront: MOCK_PHOTO,
          photoSide: MOCK_PHOTO,
          photoRear: MOCK_PHOTO,
        })
      expect(res.status).toBe(409)
    })

    it('Missing photos → 201 (photos optional)', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlate: '51B-999.99',
          name: 'No-Photo Bus',
          capacity: 20,
        })
      expect(res.status).toBe(201)
      expect(res.body.photoFront).toBe('')
    })

    it('BusManager cannot create bus → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({
          licensePlate: '51C-111.11',
          name: 'Unauthorized Bus',
          capacity: 20,
          photoFront: MOCK_PHOTO,
          photoSide: MOCK_PHOTO,
          photoRear: MOCK_PHOTO,
        })
      expect(res.status).toBe(403)
    })
  })

  describe('RoundBusAssignment', () => {
    beforeAll(async () => {
      const tripRes = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Assignment Test Trip', startDate: '2026-09-01', endDate: '2026-09-02' })
      tripId = tripRes.body.id

      const roundRes = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Leg 1', sequence: 1,
          departurePoint: 'A', arrivalPoint: 'B',
          scheduledDep: '2026-09-01T08:00:00Z',
          scheduledArr: '2026-09-01T12:00:00Z',
        })
      roundId = roundRes.body.id
    })

    it('Admin assigns bus to round → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ busId })
      expect(res.status).toBe(201)
    })

    it('Duplicate bus assignment → 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ busId })
      expect(res.status).toBe(409)
    })

    it('Assign BusManager to bus/round → 201', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login').send({ email: 'driver@demo.com', password: 'password123' })
      const bmUserId = loginRes.body.userId

      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses/${busId}/manager`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: bmUserId })
      expect(res.status).toBe(201)
    })

    it('BusManager cannot assign buses → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/rounds/${roundId}/buses`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ busId })
      expect(res.status).toBe(403)
    })
  })
})
