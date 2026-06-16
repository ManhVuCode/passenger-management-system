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

  /** Số lượng xe theo tenant (dùng cho các báo cáo tổng hợp như chat snapshot). */
  async countForTenant(tenantId: string): Promise<number> {
    return this.prisma.bus.count({ where: { tenantId } })
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
      data: {
        tenantId,
        ...dto,
        photoFront: dto.photoFront ?? '',
        photoSide: dto.photoSide ?? '',
        photoRear: dto.photoRear ?? '',
      },
    })
  }

  async update(id: string, tenantId: string, dto: UpdateBusDto) {
    await this.findOne(id, tenantId)
    return this.prisma.bus.update({ where: { id }, data: dto })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    // Không cascade: xe còn gán vào round mang theo phân bổ + điểm danh lịch sử.
    // Buộc Admin gỡ xe khỏi các round trước, tránh xóa nhầm dữ liệu vận hành.
    const assignments = await this.prisma.roundBusAssignment.count({ where: { busId: id } })
    if (assignments > 0) {
      throw new ConflictException(
        `Bus is assigned to ${assignments} round(s). Remove it from all rounds first.`,
      )
    }
    return this.prisma.bus.delete({ where: { id } })
  }
}
