import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

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
          photoFront: 'https://example.com/front.jpg',
          photoSide: 'https://example.com/side.jpg',
          photoRear: 'https://example.com/rear.jpg',
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
          photoFront: 'https://example.com/f.jpg',
          photoSide: 'https://example.com/s.jpg',
          photoRear: 'https://example.com/r.jpg',
        })
      expect(res.status).toBe(409)
    })

    it('Missing photo → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlate: '51B-999.99',
          name: 'Incomplete Bus',
          capacity: 20,
          photoFront: 'https://example.com/f.jpg',
        })
      expect(res.status).toBe(400)
    })

    it('BusManager cannot create bus → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/buses')
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({
          licensePlate: '51C-111.11',
          name: 'Unauthorized Bus',
          capacity: 20,
          photoFront: 'https://x.com/f.jpg',
          photoSide: 'https://x.com/s.jpg',
          photoRear: 'https://x.com/r.jpg',
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
