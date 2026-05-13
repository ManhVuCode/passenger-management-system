import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBusDto } from './dto/create-bus.dto'
import { UpdateBusDto } from './dto/update-bus.dto'

@Injectable()
export class BusService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.bus.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id, tenantId } })
    if (!bus) throw new NotFoundException('Bus not found')
    return bus
  }

  async create(tenantId: string, dto: CreateBusDto) {
    const existing = await this.prisma.bus.findUnique({
      where: { licensePlate: dto.licensePlate },
    })
    if (existing) throw new ConflictException('License plate already registered')

    return this.prisma.bus.create({
      data: { tenantId, ...dto },
    })
  }

  async update(id: string, tenantId: string, dto: UpdateBusDto) {
    await this.findOne(id, tenantId)
    return this.prisma.bus.update({ where: { id }, data: dto })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.bus.delete({ where: { id } })
  }
}
