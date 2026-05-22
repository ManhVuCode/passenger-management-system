import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SystemAdminService } from '../system-admin/system-admin.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private systemAdminService: SystemAdminService,
  ) {}

  async listByTenant(tenantId: string) {
    const users = await this.systemAdminService.listUsers(tenantId)
    return users.filter((u) => u.role !== 'SYSTEM_ADMIN')
  }

  async create(tenantId: string, dto: CreateUserDto) {
    return this.systemAdminService.createUser(tenantId, dto)
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'SYSTEM_ADMIN') {
      throw new ForbiddenException('Cannot modify SYSTEM_ADMIN user')
    }
    return this.systemAdminService.updateUser(tenantId, userId, dto)
  }

  async remove(tenantId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new BadRequestException('Cannot delete your own account')
    }
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'SYSTEM_ADMIN') {
      throw new ForbiddenException('Cannot delete SYSTEM_ADMIN user')
    }
    await this.systemAdminService.removeUser(userId)
  }
}
