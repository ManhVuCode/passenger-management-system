import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dto/login.dto'
import { LoginResponseDto, JwtPayload } from '@pms/shared'
import { encryptPassword } from '../common/crypto/password-crypto'

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

    // Login-capture backfill: legacy accounts (seeded/created before passwordEnc existed)
    // have passwordEnc = null. The plaintext is verified right here — the only place it
    // exists in cleartext — so capture it once. This lets SYSTEM_ADMIN view the current
    // password without forcing a reset. No-op if the key is unset or it is already stored.
    if (!user.passwordEnc) {
      const enc = encryptPassword(dto.password)
      if (enc) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordEnc: enc },
        })
      }
    }

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
      email: user.email,
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Current password is incorrect')
    if (newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters')
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordEnc: encryptPassword(newPassword) },
    })
    return { message: 'Password changed successfully' }
  }
}
