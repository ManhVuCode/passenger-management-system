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
