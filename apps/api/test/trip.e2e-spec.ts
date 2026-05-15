import request from 'supertest'
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

    it('Trip name with special chars (!) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Trip@#!',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
        })
      expect(res.status).toBe(400)
    })

    it('Trip name with hyphen → 201 (allowed)', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hanoi-Sapa Day 1',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
        })
      expect(res.status).toBe(201)
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
