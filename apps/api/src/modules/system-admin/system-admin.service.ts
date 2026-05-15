import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { Role } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SystemAdminService {
  constructor(private prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: 'platform' } },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(
      tenants.map(async (t) => {
        const [adminsCount, managersCount] = await Promise.all([
          this.prisma.user.count({ where: { tenantId: t.id, role: 'ADMIN' } }),
          this.prisma.user.count({ where: { tenantId: t.id, role: 'BUS_MANAGER' } }),
        ])
        return { ...t, adminsCount, managersCount }
      }),
    )
  }

  async createTenant(data: { name: string; slug: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } })
    if (existing) throw new ConflictException('Slug already exists')
    return this.prisma.tenant.create({
      data: { name: data.name, slug: data.slug, status: 'ACTIVE' },
    })
  }

  async updateTenant(id: string, data: { name?: string; status?: 'ACTIVE' | 'SUSPENDED' }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return this.prisma.tenant.update({ where: { id }, data })
  }

  async listUsers(tenantId: string, roleFilter?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return this.prisma.user.findMany({
      where: {
        tenantId,
        ...(roleFilter && { role: roleFilter as Role }),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  }

  async createUser(
    tenantId: string,
    data: { email: string; name: string; role: 'ADMIN' | 'BUS_MANAGER'; password: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('Email already exists')
    const passwordHash = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: { tenantId, email: data.email, name: data.name, role: data.role, passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
  }

  async updateUser(
    userId: string,
    data: { name?: string; role?: 'ADMIN' | 'BUS_MANAGER' },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
  }

  async removeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    await this.prisma.user.delete({ where: { id: userId } })
    return { success: true }
  }
}
