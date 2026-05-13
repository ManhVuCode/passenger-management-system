# Sprint 1B — Auth, RBAC, Tenant Isolation

## Goal
Implement a fully working authentication and authorization system.
Success criteria:
- POST /auth/login returns JWT with correct payload
- Every protected route requires valid JWT
- Cross-tenant access returns HTTP 403
- Role-based access enforced per route
- All E2E tests pass

## Read first
Read `CLAUDE.md`. Domain rules are locked. Follow Karpathy guidelines — ask before assuming.

## Branch
```bash
git checkout develop
git checkout -b sprint/sprint-1b-auth
```

---

## Step 1 — PrismaModule

Create `apps/api/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Create `apps/api/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

---

## Step 2 — Shared decorators and types

Create `apps/api/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { JwtPayload } from '@pms/shared'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
```

Create `apps/api/src/common/decorators/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common'
import { Role } from '@pms/shared'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
```

---

## Step 3 — Guards

Create `apps/api/src/common/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Create `apps/api/src/common/guards/roles.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@pms/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) return true

    const { user } = context.switchToHttp().getRequest()
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient role')
    }
    return true
  }
}
```

Create `apps/api/src/common/guards/tenant.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // If no user (public routes), pass through — JwtAuthGuard handles auth
    if (!user) return true

    // Tenant param from URL (e.g. resource query or body tenantId)
    const paramTenantId = request.params?.tenantId || request.body?.tenantId
    if (paramTenantId && paramTenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied')
    }
    return true
  }
}
```

---

## Step 4 — JWT Strategy

Create `apps/api/src/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '@pms/shared'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    })
    if (!user) throw new UnauthorizedException()
    return payload   // attached to request.user
  }
}
```

---

## Step 5 — AuthModule

Create `apps/api/src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}
```

Create `apps/api/src/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dto/login.dto'
import { LoginResponseDto, JwtPayload } from '@pms/shared'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials')

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    })
    if (tenant?.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is suspended')
    }

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    }

    const accessToken = this.jwt.sign(payload)

    return {
      accessToken,
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    }
  }
}
```

Create `apps/api/src/auth/auth.controller.ts`:
```typescript
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}
```

Create `apps/api/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
```

---

## Step 6 — AppModule wiring

Update `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { TenantGuard } from './common/guards/tenant.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },   // global: all routes require JWT
    { provide: APP_GUARD, useClass: RolesGuard },      // global: enforce @Roles()
    { provide: APP_GUARD, useClass: TenantGuard },     // global: cross-tenant check
  ],
})
export class AppModule {}
```

Add `@Public()` decorator for routes that skip JWT:

Create `apps/api/src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common'
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

Update `JwtAuthGuard` to respect `@Public()`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}
```

Mark login route as public:
```typescript
// auth.controller.ts — add @Public() to login()
@Public()
@Post('login')
@HttpCode(HttpStatus.OK)
login(@Body() dto: LoginDto) { ... }
```

---

## Step 7 — Seed data

Create `apps/api/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tours' },
    update: {},
    create: {
      name: 'Demo Tours',
      slug: 'demo-tours',
      status: 'ACTIVE',
    },
  })

  console.log('Tenant created:', tenant.slug)

  const hash = await bcrypt.hash('password123', 10)

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash: hash,
      name: 'Demo Admin',
      role: 'ADMIN',
    },
  })

  // BusManager user
  const busManager = await prisma.user.upsert({
    where: { email: 'driver@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'driver@demo.com',
      passwordHash: hash,
      name: 'Demo Driver',
      role: 'BUS_MANAGER',
    },
  })

  // Second tenant for cross-tenant isolation test
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'other-tours' },
    update: {},
    create: {
      name: 'Other Tours',
      slug: 'other-tours',
      status: 'ACTIVE',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin2@other.com' },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'admin2@other.com',
      passwordHash: hash,
      name: 'Other Admin',
      role: 'ADMIN',
    },
  })

  console.log('Seed complete')
  console.log('Admin:', admin.email, '/ password: password123')
  console.log('Driver:', busManager.email, '/ password: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run seed:
```bash
cd apps/api
npx ts-node prisma/seed.ts
```

---

## Step 8 — E2E tests

Install test dependencies:
```bash
cd apps/api
pnpm add -D supertest @types/supertest
```

Create `apps/api/test/auth.e2e-spec.ts`:
```typescript
import * as request from 'supertest'
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
      const res = await request(app.getHttpServer()).get('/trips')
      expect(res.status).toBe(401)
    })

    it('valid token → not 401', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.com', password: 'password123' })

      const token = loginRes.body.accessToken
      // /trips not implemented yet — expect 404, not 401
      const res = await request(app.getHttpServer())
        .get('/trips')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).not.toBe(401)
    })
  })
})
```

Run tests:
```bash
cd apps/api
pnpm test:e2e
```

verify: all 5 tests pass

---

## Step 9 — ValidationPipe in main.ts

Update `apps/api/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors()
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}`)
}
bootstrap()
```

---

## Step 10 — Smoke test the running server

```bash
cd apps/api
pnpm dev &

# Wait 3 seconds for server to start
sleep 3

# Test login endpoint
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}' | jq .

# Test protected route without token
curl -s http://localhost:3000/trips | jq .
# Expect: 401 Unauthorized
```

---

## Step 11 — Commit and merge

```bash
cd ~/thesis/passenger-management-system
rtk git status
git add .
git commit -m "feat(sprint1b): auth, RBAC guards, tenant isolation, seed, e2e tests"
git push origin sprint/sprint-1b-auth

# Merge into develop
git checkout develop
git merge sprint/sprint-1b-auth
git push origin develop
```

Update `CLAUDE.md` sprint table — Sprint 1 status: ✅ DONE

---

## Success Criteria Checklist
- [ ] POST /auth/login → 200 + { accessToken, role, tenantId }
- [ ] Wrong password → 401
- [ ] No token on protected route → 401
- [ ] Valid token → passes through guards
- [ ] @Public() routes skip JWT check
- [ ] @Roles(Role.ADMIN) blocks BUS_MANAGER
- [ ] TenantGuard blocks cross-tenant tenantId in body/params
- [ ] Seed: admin@demo.com + driver@demo.com created
- [ ] All E2E tests pass
- [ ] pnpm build → zero TypeScript errors
