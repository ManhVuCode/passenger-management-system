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
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
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

    // Xe mới xếp cuối đội: order = max hiện có + 1.
    const max = await this.prisma.bus.aggregate({
      where: { tenantId },
      _max: { order: true },
    })

    return this.prisma.bus.create({
      data: {
        tenantId,
        order: (max._max.order ?? 0) + 1,
        ...dto,
        photoFront: dto.photoFront ?? '',
        photoSide: dto.photoSide ?? '',
        photoRear: dto.photoRear ?? '',
      },
    })
  }

  /**
   * Đổi chỗ một xe với xe liền kề theo thứ tự hiển thị (swap order).
   * 'up' = đổi với xe đứng ngay trước; 'down' = đổi với xe đứng ngay sau.
   * Xe ở đầu/cuối thì không đổi gì. Trả về danh sách đã sắp xếp lại.
   */
  async move(id: string, tenantId: string, direction: 'up' | 'down') {
    const bus = await this.findOne(id, tenantId)
    const neighbor = await this.prisma.bus.findFirst({
      where: {
        tenantId,
        order: direction === 'up' ? { lt: bus.order } : { gt: bus.order },
      },
      orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
    })
    if (neighbor) {
      await this.prisma.$transaction([
        this.prisma.bus.update({ where: { id: bus.id }, data: { order: neighbor.order } }),
        this.prisma.bus.update({ where: { id: neighbor.id }, data: { order: bus.order } }),
      ])
    }
    return this.findAll(tenantId)
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
