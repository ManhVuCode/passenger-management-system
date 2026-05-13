import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRoundDto } from './dto/create-round.dto'
import { UpdateRoundStatusDto } from './dto/update-round-status.dto'
import { RoundStatus, Role, JwtPayload } from '@pms/shared'
import { AttendanceGateway } from '../../gateway/attendance.gateway'

@Injectable()
export class RoundService {
  constructor(
    private prisma: PrismaService,
    private gateway: AttendanceGateway,
  ) {}

  async findAllByTrip(tripId: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')

    return this.prisma.round.findMany({
      where: { tripId, tenantId },
      orderBy: { sequence: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')
    return round
  }

  async create(tripId: string, tenantId: string, dto: CreateRoundDto) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')

    const existing = await this.prisma.round.findUnique({
      where: { tripId_sequence: { tripId, sequence: dto.sequence } },
    })
    if (existing) throw new BadRequestException(`Sequence ${dto.sequence} already exists in this trip`)

    return this.prisma.round.create({
      data: {
        tripId,
        tenantId,
        name: dto.name,
        sequence: dto.sequence,
        departurePoint: dto.departurePoint,
        arrivalPoint: dto.arrivalPoint,
        scheduledDep: new Date(dto.scheduledDep),
        scheduledArr: new Date(dto.scheduledArr),
        status: RoundStatus.PLANNED,
      },
    })
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateRoundStatusDto, user: JwtPayload) {
    const round = await this.findOne(id, tenantId)

    if (user.role === Role.BUS_MANAGER) {
      const assignment = await this.prisma.busManagerAssignment.findFirst({
        where: { roundId: id, userId: user.userId },
      })
      if (!assignment) {
        throw new ForbiddenException('BusManager can only update their own assigned round')
      }
      if (dto.status === RoundStatus.CANCELLED) {
        throw new ForbiddenException('BusManager cannot cancel a round')
      }
    }

    this.validateStatusTransition(round.status as RoundStatus, dto.status)

    const updated = await this.prisma.round.update({
      where: { id },
      data: { status: dto.status },
    })

    if (dto.status === RoundStatus.CANCELLED) {
      await this.cascadeCancelAttendance(id)
    }

    this.gateway.broadcastRoundStatusUpdate({
      tripId: round.tripId,
      roundId: id,
      status: dto.status,
    })

    return updated
  }

  private validateStatusTransition(current: RoundStatus, next: RoundStatus) {
    const allowed: Record<RoundStatus, RoundStatus[]> = {
      [RoundStatus.PLANNED]: [RoundStatus.IN_PROGRESS, RoundStatus.CANCELLED],
      [RoundStatus.IN_PROGRESS]: [RoundStatus.DONE, RoundStatus.CANCELLED],
      [RoundStatus.DONE]: [],
      [RoundStatus.CANCELLED]: [],
    }
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition round from ${current} to ${next}`,
      )
    }
  }

  private async cascadeCancelAttendance(roundId: string) {
    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: {
        roundBusAssignment: { roundId },
      },
      select: { id: true },
    })

    if (rpas.length === 0) return

    await this.prisma.attendanceRecord.updateMany({
      where: {
        roundPassengerAssignmentId: { in: rpas.map((r) => r.id) },
      },
      data: { status: 'CANCELLED' },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.round.delete({ where: { id } })
  }
}
