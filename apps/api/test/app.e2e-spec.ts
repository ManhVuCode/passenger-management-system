import request from 'supertest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from './../src/app.module'

describe('App (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/ (GET) without token → 401 (protected by JwtAuthGuard)', () => {
    return request(app.getHttpServer()).get('/').expect(401)
  })

  it('GET /health → 200 { status: ok }', async () => {
    const res = await request(app.getHttpServer()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
    expect(typeof res.body.uptime).toBe('number')
    expect(res.body.uptime).toBeGreaterThanOrEqual(0)
  })

  afterEach(async () => {
    await app.close()
  })
})
