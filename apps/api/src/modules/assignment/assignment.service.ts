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

    return this.prisma.roundBusAssignment.delete({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
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
    if (!rba) throw new NotFoundException('Bus not assigned to this round')

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId, role: Role.BUS_MANAGER },
    })
    if (!user) throw new NotFoundException('BusManager not found in this tenant')

    return this.prisma.busManagerAssignment.upsert({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
      update: { userId: dto.userId },
      create: { tripId, roundId, busId, userId: dto.userId },
    })
  }

  async removeBusManager(tripId: string, roundId: string, busId: string, _tenantId: string) {
    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
    if (!rba) throw new NotFoundException('Bus not assigned to this round')

    return this.prisma.busManagerAssignment.delete({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
  }
}
