import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AssignBusDto } from './dto/assign-bus.dto'
import { AssignBusManagerDto } from './dto/assign-bus-manager.dto'
import { Role } from '@pms/shared'

@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) {}

  async assignBusToRound(tripId: string, roundId: string, tenantId: string, dto: AssignBusDto) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    const bus = await this.prisma.bus.findFirst({
      where: { id: dto.busId, tenantId },
    })
    if (!bus) throw new NotFoundException('Bus not found')

    const existing = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId: dto.busId } },
    })
    if (existing) throw new ConflictException('Bus already assigned to this round')

    return this.prisma.roundBusAssignment.create({
      data: { tripId, roundId, busId: dto.busId, tenantId },
    })
  }

  async getRoundBusAssignments(tripId: string, roundId: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    return this.prisma.roundBusAssignment.findMany({
      where: { tripId, roundId },
      include: {
        bus: true,
        busManagerAssignment: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
  }

  async removeBusFromRound(tripId: string, roundId: string, busId: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    // Gỡ xe = gỡ cả tài xế + phân bổ hành khách + điểm danh của xe đó trong round này
    // (xóa theo thứ tự phụ thuộc FK — schema không khai báo onDelete: Cascade).
    const results = await this.prisma.$transaction([
      this.prisma.attendanceRecord.deleteMany({
        where: { roundPassengerAssignment: { tripId, roundId, busId } },
      }),
      this.prisma.roundPassengerAssignment.deleteMany({ where: { tripId, roundId, busId } }),
      this.prisma.busManagerAssignment.deleteMany({ where: { tripId, roundId, busId } }),
      this.prisma.roundBusAssignment.delete({
        where: { tripId_roundId_busId: { tripId, roundId, busId } },
      }),
    ])
    return results[results.length - 1]
  }

  async assignBusManager(
    tripId: string,
    roundId: string,
    busId: string,
    tenantId: string,
    dto: AssignBusManagerDto,
  ) {
    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
    if (!rba || rba.tenantId !== tenantId) {
      throw new NotFoundException('Bus not assigned to this round')
    }

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId, role: Role.BUS_MANAGER },
    })
    if (!user) throw new NotFoundException('BusManager not found in this tenant')

    // R4: một BusManager chỉ được quản lý TỐI ĐA MỘT bus mỗi round. tripId/roundId ở đây
    // đã được xác thực tenant qua bước kiểm tra RoundBusAssignment phía trên, nên truy vấn
    // trực tiếp là an toàn về tenant. Từ chối nếu tài xế này đã ở một bus khác.
    const otherBus = await this.prisma.busManagerAssignment.findFirst({
      where: { tripId, roundId, userId: dto.userId, NOT: { busId } },
    })
    if (otherBus) {
      throw new ConflictException(
        'Driver is already assigned to another bus in this round',
      )
    }

    return this.prisma.busManagerAssignment.upsert({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
      update: { userId: dto.userId },
      create: { tripId, roundId, busId, userId: dto.userId },
    })
  }

  async removeBusManager(tripId: string, roundId: string, busId: string, tenantId: string) {
    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
    if (!rba || rba.tenantId !== tenantId) {
      throw new NotFoundException('Bus not assigned to this round')
    }

    return this.prisma.busManagerAssignment.delete({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
  }
}
