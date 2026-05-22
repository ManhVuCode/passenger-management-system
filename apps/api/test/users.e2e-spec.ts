import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Users (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminToken: string
  let createdUserId: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    prisma = module.get(PrismaService)

    await prisma.user.deleteMany({ where: { email: 'testdriver999@demo.com' } })

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo.com', password: 'password123' })
    adminToken = res.body.accessToken
  })

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {})
    }
    await app.close()
  })

  it('GET /users → Admin sees own tenant users only (no SYSTEM_ADMIN)', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    res.body.forEach((u: { role: string }) => {
      expect(u.role).not.toBe('SYSTEM_ADMIN')
    })
  })

  it('POST /users → Admin creates BusManager', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Driver',
        email: 'testdriver999@demo.com',
        phone: '0901999888',
        role: 'BUS_MANAGER',
        password: 'password123',
      })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('BUS_MANAGER')
    expect(res.body.phone).toBe('0901999888')
    createdUserId = res.body.id
  })

  it('POST /users → duplicate email → 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dup',
        email: 'admin@demo.com',
        role: 'ADMIN',
        password: 'password123',
      })
    expect(res.status).toBe(409)
  })

  it('PATCH /users/:id → Admin updates user', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Driver' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Driver')
  })

  it('DELETE /users/:id → Admin removes user', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
    createdUserId = ''
  })

  it('DELETE /users/:id → cannot delete self → 400', async () => {
    const me = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo.com', password: 'password123' })
    const myId = me.body.userId
    const res = await request(app.getHttpServer())
      .delete(`/users/${myId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })
})
