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

  afterEach(async () => {
    await app.close()
  })
})
