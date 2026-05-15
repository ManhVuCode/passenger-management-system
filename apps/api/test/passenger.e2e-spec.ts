import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Passengers (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let busManagerToken: string
  let tripId: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    prisma = module.get(PrismaService)

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = adminRes.body.accessToken

    const bmRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'driver@demo.com', password: 'password123' })
    busManagerToken = bmRes.body.accessToken

    const tripRes = await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Passenger Test Trip', startDate: '2026-10-01', endDate: '2026-10-03' })
    tripId = tripRes.body.id
  })

  afterAll(async () => {
    await prisma.tripPassengerAssignment.deleteMany({ where: { tripId } })
    await prisma.trip.delete({ where: { id: tripId } }).catch(() => undefined)
    await app.close()
  })

  describe('Standalone passenger creation', () => {
    it('Admin adds passenger → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nguyen Van A', phone: '0901234567', type: 'KTMT', note: 'VIP' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Nguyen Van A')
      expect(res.body.type).toBe('KTMT')
    })

    it('Passenger type is free-text — any string accepted', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tran Thi B', phone: '0912345678', type: 'CUSTOM_TYPE_XYZ' })
      expect(res.status).toBe(201)
      expect(res.body.type).toBe('CUSTOM_TYPE_XYZ')
    })

    it('Missing name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '0901111111' })
      expect(res.status).toBe(400)
    })

    it('Phone with 9 digits → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Pax', phone: '090123456' })
      expect(res.status).toBe(400)
    })

    it('Phone with 11 digits → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Pax', phone: '09012345678' })
      expect(res.status).toBe(400)
    })

    it('Phone with hyphen → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Pax', phone: '090-123456' })
      expect(res.status).toBe(400)
    })

    it('Phone exactly 10 digits → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Valid Pax', phone: '0901234999' })
      expect(res.status).toBe(201)
    })

    it('BusManager cannot add passenger → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ name: 'Test', phone: '0900000000' })
      expect(res.status).toBe(403)
    })
  })

  describe('Bulk import', () => {
    it('Admin bulk creates passengers → returns created count', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          passengers: [
            { name: 'Bulk A', phone: '0911111111' },
            { name: 'Bulk B', phone: '0922222222', type: 'KHMT' },
            { name: 'Bulk C', phone: '0933333333', type: 'CGC', note: 'Elderly' },
          ],
        })
      expect(res.status).toBe(201)
      expect(res.body.created).toBe(3)
    })

    it('Empty passengers array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ passengers: [] })
      expect(res.status).toBe(400)
    })
  })

  describe('Passenger list', () => {
    it('GET passengers returns list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('BusManager can read passenger list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${busManagerToken}`)
      expect(res.status).toBe(200)
    })
  })

  describe('Update passenger note', () => {
    let passengerId: string

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Note Test', phone: '0944444444' })
      passengerId = res.body.id
    })

    it('Admin updates note → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/passengers/${passengerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Needs wheelchair assistance' })
      expect(res.status).toBe(200)
      expect(res.body.note).toBe('Needs wheelchair assistance')
    })

    it('BusManager cannot update passenger → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/trips/${tripId}/passengers/${passengerId}`)
        .set('Authorization', `Bearer ${busManagerToken}`)
        .send({ note: 'Should fail' })
      expect(res.status).toBe(403)
    })
  })

  describe('Sheet sync', () => {
    it('Mode GENERATE → returns template info', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers/sheet-sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mode: 'GENERATE' })
      expect(res.status).toBe(201)
      expect(res.body.templateColumns).toContain('name')
      expect(res.body.templateColumns).toContain('phone')
    })

    it('Mode IMPORT with valid URL → returns column mapping', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers/sheet-sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'IMPORT',
          sheetUrl: 'https://docs.google.com/spreadsheets/d/test123',
        })
      expect(res.status).toBe(201)
      expect(res.body.detectedMapping).toBeDefined()
    })

    it('Mode IMPORT without URL → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/trips/${tripId}/passengers/sheet-sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mode: 'IMPORT' })
      expect(res.status).toBe(400)
    })
  })

  describe('Xlsx export', () => {
    it('GET export/xlsx → Content-Type xlsx', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trips/${tripId}/passengers/export/xlsx`)
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    })
  })
})
