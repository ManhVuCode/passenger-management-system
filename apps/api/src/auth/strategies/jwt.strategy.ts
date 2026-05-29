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
      secretOrKey: config.get<string>('JWT_SECRET')!,
    })
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: { select: { status: true } } },
    })
    if (!user) throw new UnauthorizedException()
    if (user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is suspended')
    }
    // Source role/tenant from the DB, not the token, so a demoted or moved
    // user cannot keep stale privileges for the remaining life of the token.
    return { userId: user.id, tenantId: user.tenantId, role: user.role }
  }
}
