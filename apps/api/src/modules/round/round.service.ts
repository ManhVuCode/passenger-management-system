import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRoundDto } from './dto/create-round.dto'
import { UpdateRoundStatusDto } from './dto/update-round-status.dto'
import { UpdateRoundDto } from './dto/update-round.dto'
import { RoundStatus, Role, JwtPayload } from '@pms/shared'
import { AttendanceGateway } from '../../gateway/attendance.gateway'
import { RoundEvents, type RoundEventPayload } from '../../common/events/round.events'

@Injectable()
export class RoundService {
  constructor(
    private prisma: PrismaService,
    private gateway: AttendanceGateway,
    private events: EventEmitter2,
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

    const scheduledDep = dto.scheduledDep ? new Date(dto.scheduledDep) : null
    const scheduledArr = dto.scheduledArr ? new Date(dto.scheduledArr) : null
    await this.assertValidRoundTimes(trip, tripId, null, scheduledDep, scheduledArr)

    return this.prisma.round.create({
      data: {
        tripId,
        tenantId,
        name: dto.name,
        sequence: dto.sequence,
        departurePoint: dto.departurePoint || null,
        arrivalPoint: dto.arrivalPoint || null,
        scheduledDep,
        scheduledArr,
        status: RoundStatus.PLANNED,
      },
    })
  }

  /** Sửa thông tin chặng. Admin được đổi trạng thái tự do, kể cả khôi phục chặng
   *  lỡ bấm huỷ (CANCELLED → PLANNED) — khi đó các bản ghi điểm danh đã bị cascade-huỷ
   *  sẽ bị xoá để hành khách quay về trạng thái "chưa điểm danh". */
  async update(id: string, tenantId: string, dto: UpdateRoundDto) {
    const round = await this.findOne(id, tenantId)

    if (dto.sequence !== undefined && dto.sequence !== round.sequence) {
      const existing = await this.prisma.round.findUnique({
        where: { tripId_sequence: { tripId: round.tripId, sequence: dto.sequence } },
      })
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Sequence ${dto.sequence} already exists in this trip`)
      }
    }

    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.sequence !== undefined) data.sequence = dto.sequence
    if (dto.departurePoint !== undefined) data.departurePoint = dto.departurePoint || null
    if (dto.arrivalPoint !== undefined) data.arrivalPoint = dto.arrivalPoint || null
    if (dto.scheduledDep !== undefined)
      data.scheduledDep = dto.scheduledDep ? new Date(dto.scheduledDep) : null
    if (dto.scheduledArr !== undefined)
      data.scheduledArr = dto.scheduledArr ? new Date(dto.scheduledArr) : null

    if (dto.scheduledDep !== undefined || dto.scheduledArr !== undefined) {
      const trip = await this.prisma.trip.findFirst({ where: { id: round.tripId, tenantId } })
      const newDep =
        dto.scheduledDep !== undefined
          ? dto.scheduledDep
            ? new Date(dto.scheduledDep)
            : null
          : round.scheduledDep
      const newArr =
        dto.scheduledArr !== undefined
          ? dto.scheduledArr
            ? new Date(dto.scheduledArr)
            : null
          : round.scheduledArr
      if (trip) await this.assertValidRoundTimes(trip, round.tripId, id, newDep, newArr)
    }

    const from = round.status as RoundStatus
    const to = dto.status as RoundStatus | undefined
    const statusChanged = to !== undefined && to !== from
    if (to !== undefined) data.status = to

    const updated = await this.prisma.round.update({ where: { id }, data })

    if (statusChanged && to) {
      if (to === RoundStatus.CANCELLED) {
        await this.cascadeCancelAttendance(id)
      } else if (from === RoundStatus.CANCELLED) {
        await this.restoreCancelledAttendance(id)
      }
      this.gateway.broadcastRoundStatusUpdate({ tripId: round.tripId, roundId: id, status: to })
      const event = this.statusEvent(to)
      if (event) {
        const payload: RoundEventPayload = { tenantId, tripId: round.tripId, roundId: id }
        this.events.emit(event, payload)
      }
    }

    return updated
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

    // Chỉ là side-effect — emit SAU KHI thay đổi status đã được commit. Hành vi
    // hiện có không bị động đến; NotificationDispatcher sẽ phản ứng với các sự kiện này.
    const event = this.statusEvent(dto.status)
    if (event) {
      const payload: RoundEventPayload = { tenantId, tripId: round.tripId, roundId: id }
      this.events.emit(event, payload)
    }

    return updated
  }

  private statusEvent(status: RoundStatus): string | null {
    switch (status) {
      case RoundStatus.IN_PROGRESS:
        return RoundEvents.STARTED
      case RoundStatus.CANCELLED:
        return RoundEvents.CANCELLED
      case RoundStatus.DONE:
        return RoundEvents.COMPLETED
      default:
        return null
    }
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

  /** Kiểm tra thời gian chặng (chỉ khi có nhập giờ): dep ≤ arr, nằm trong [startDate, endDate]
   *  của chuyến, và KHÔNG trùng khoảng thời gian với chặng khác cùng chuyến. */
  private async assertValidRoundTimes(
    trip: { startDate: Date; endDate: Date },
    tripId: string,
    roundId: string | null,
    dep: Date | null,
    arr: Date | null,
  ) {
    if (dep && arr && dep > arr) {
      throw new BadRequestException('Giờ khởi hành của chặng phải trước giờ đến')
    }
    if (dep && dep < trip.startDate) {
      throw new BadRequestException('Giờ khởi hành của chặng phải nằm trong khoảng thời gian chuyến đi')
    }
    if (arr && arr > trip.endDate) {
      throw new BadRequestException('Giờ đến của chặng phải nằm trong khoảng thời gian chuyến đi')
    }
    if (dep && arr) {
      const others = await this.prisma.round.findMany({
        where: {
          tripId,
          ...(roundId ? { id: { not: roundId } } : {}),
          scheduledDep: { not: null },
          scheduledArr: { not: null },
        },
        select: { name: true, sequence: true, scheduledDep: true, scheduledArr: true },
      })
      for (const o of others) {
        if (o.scheduledDep && o.scheduledArr && dep < o.scheduledArr && arr > o.scheduledDep) {
          throw new BadRequestException(
            `Khoảng thời gian bị trùng với chặng #${o.sequence} (${o.name})`,
          )
        }
      }
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

  /** Đảo ngược cascade huỷ: xoá các bản ghi điểm danh đã bị set CANCELLED khi huỷ chặng,
   *  để hành khách trở lại trạng thái chưa điểm danh (pending = không có bản ghi). */
  private async restoreCancelledAttendance(roundId: string) {
    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { roundBusAssignment: { roundId } },
      select: { id: true },
    })
    if (rpas.length === 0) return
    await this.prisma.attendanceRecord.deleteMany({
      where: {
        roundPassengerAssignmentId: { in: rpas.map((r) => r.id) },
        status: 'CANCELLED',
      },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    // Xóa dây chuyền theo thứ tự phụ thuộc FK (schema không khai báo onDelete: Cascade).
    const results = await this.prisma.$transaction([
      this.prisma.attendanceRecord.deleteMany({
        where: { roundPassengerAssignment: { roundId: id } },
      }),
      this.prisma.roundPassengerAssignment.deleteMany({ where: { roundId: id } }),
      this.prisma.busManagerAssignment.deleteMany({ where: { roundId: id } }),
      this.prisma.roundBusAssignment.deleteMany({ where: { roundId: id } }),
      this.prisma.round.delete({ where: { id } }),
    ])
    return results[results.length - 1]
  }
}
