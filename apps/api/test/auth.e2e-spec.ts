import request from 'supertest'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'

describe('Auth (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()
  })

  afterAll(() => app.close())

  describe('POST /auth/login', () => {
    it('valid credentials → 200 + accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.com', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.role).toBe('ADMIN')
      expect(res.body.tenantId).toBeDefined()
    })

    it('wrong password → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.com', password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('unknown email → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })

      expect(res.status).toBe(401)
    })

    it('missing fields → 400 validation error', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  describe('Protected routes', () => {
    it('no token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/')
      expect(res.status).toBe(401)
    })

    it('valid token → not 401', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.com', password: 'password123' })

      const token = loginRes.body.accessToken
      const res = await request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).not.toBe(401)
    })
  })
})
