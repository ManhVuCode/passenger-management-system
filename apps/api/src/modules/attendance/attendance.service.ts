import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { MarkAttendanceDto } from './dto/mark-attendance.dto'
import { OverrideAttendanceDto } from './dto/override-attendance.dto'
import { RoundNoteDto } from './dto/round-note.dto'
import { AttendanceStatus, Role, JwtPayload } from '@pms/shared'
import { AttendanceGateway } from '../../gateway/attendance.gateway'

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private gateway: AttendanceGateway,
  ) {}

  async getAttendanceByRoundBus(
    tripId: string,
    roundId: string,
    busId: string,
    tenantId: string,
    user: JwtPayload,
  ) {
    if (user.role === Role.BUS_MANAGER) {
      await this.verifyBusManagerScope(user.userId, tripId, roundId, busId)
    }

    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
    if (!rba || rba.tenantId !== tenantId) {
      throw new NotFoundException('Bus not assigned to this round')
    }

    return this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId, busId },
      include: {
        tripPassengerAssignment: {
          select: { id: true, name: true, phone: true, type: true, note: true },
        },
        attendanceRecord: {
          select: { id: true, status: true, markedAt: true, markedBy: true, note: true },
        },
      },
    })
  }

  async markAttendance(
    tripId: string,
    roundId: string,
    busId: string,
    tenantId: string,
    dto: MarkAttendanceDto,
    user: JwtPayload,
  ) {
    if (user.role === Role.BUS_MANAGER) {
      await this.verifyBusManagerScope(user.userId, tripId, roundId, busId)
    }

    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
    })
    if (!rba || rba.tenantId !== tenantId) {
      throw new NotFoundException('Bus not assigned to this round')
    }

    // Domain rule #6: điểm danh của một chặng đã CANCELLED là trạng thái cuối — chặn
    // việc điểm danh lại để bản ghi đã bị huỷ theo cascade không thể quay về JOIN/ABSENT.
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
      select: { status: true },
    })
    if (!round) throw new NotFoundException('Round not found')
    if (round.status === 'CANCELLED') {
      throw new BadRequestException('Cannot mark attendance on a cancelled round')
    }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: {
        id: { in: dto.roundPassengerAssignmentIds },
        tripId,
        roundId,
        busId,
      },
    })
    if (rpas.length !== dto.roundPassengerAssignmentIds.length) {
      throw new NotFoundException(
        'One or more passengers not found on this bus in this round',
      )
    }

    const records = await this.prisma.$transaction(
      dto.roundPassengerAssignmentIds.map((rpaId) =>
        this.prisma.attendanceRecord.upsert({
          where: { roundPassengerAssignmentId: rpaId },
          update: {
            status: dto.status,
            markedBy: user.userId,
            markedAt: new Date(),
            ...(dto.note !== undefined && { note: dto.note }),
          },
          create: {
            roundPassengerAssignmentId: rpaId,
            status: dto.status,
            markedBy: user.userId,
            markedAt: new Date(),
            note: dto.note,
          },
        }),
      ),
    )

    const rpaDetails = await this.prisma.roundPassengerAssignment.findMany({
      where: { id: { in: dto.roundPassengerAssignmentIds } },
      include: { tripPassengerAssignment: { select: { id: true, name: true } } },
    })
    const markedAtIso = new Date().toISOString()
    for (const rpa of rpaDetails) {
      this.gateway.broadcastAttendanceUpdate({
        tripId,
        roundId,
        busId,
        passengerId: rpa.tripPassengerAssignment.id,
        passengerName: rpa.tripPassengerAssignment.name,
        status: dto.status,
        markedBy: user.userId,
        markedAt: markedAtIso,
      })
    }

    return { marked: records.length, status: dto.status, records }
  }

  async overrideAttendance(
    attendanceRecordId: string,
    tenantId: string,
    dto: OverrideAttendanceDto,
    user: JwtPayload,
  ) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id: attendanceRecordId },
      include: {
        roundPassengerAssignment: {
          include: {
            roundBusAssignment: { select: { tenantId: true } },
          },
        },
      },
    })

    if (!record || record.roundPassengerAssignment.roundBusAssignment.tenantId !== tenantId) {
      throw new NotFoundException('Attendance record not found')
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: attendanceRecordId },
      data: {
        status: dto.status,
        markedBy: user.userId,
        markedAt: new Date(),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    })

    const rpa = await this.prisma.roundPassengerAssignment.findUnique({
      where: { id: record.roundPassengerAssignmentId },
      include: {
        tripPassengerAssignment: { select: { id: true, name: true } },
        roundBusAssignment: { select: { tripId: true, roundId: true, busId: true } },
      },
    })
    if (rpa) {
      this.gateway.broadcastAttendanceUpdate({
        tripId: rpa.roundBusAssignment.tripId,
        roundId: rpa.roundBusAssignment.roundId,
        busId: rpa.roundBusAssignment.busId,
        passengerId: rpa.tripPassengerAssignment.id,
        passengerName: rpa.tripPassengerAssignment.name,
        status: dto.status,
        markedBy: user.userId,
        markedAt: new Date().toISOString(),
      })
    }

    return updated
  }

  async setRoundNote(
    tripId: string,
    roundId: string,
    tenantId: string,
    dto: RoundNoteDto,
  ) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    return this.prisma.round.update({
      where: { id: roundId },
      data: { operationalNote: dto.note },
    })
  }

  async getAttendanceSummary(tripId: string, roundId: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: { attendanceRecord: { select: { status: true } } },
    })

    const total = rpas.length
    const join = rpas.filter((r) => r.attendanceRecord?.status === AttendanceStatus.JOIN).length
    const absent = rpas.filter((r) => r.attendanceRecord?.status === AttendanceStatus.ABSENT).length
    const cancelled = rpas.filter((r) => r.attendanceRecord?.status === AttendanceStatus.CANCELLED).length
    const pending = total - join - absent - cancelled

    return {
      total,
      join,
      absent,
      cancelled,
      pending,
      roundId,
      operationalNote: round.operationalNote,
    }
  }

  async getMyAssignments(userId: string, _tenantId: string) {
    const assignments = await this.prisma.busManagerAssignment.findMany({
      where: { userId },
      include: {
        roundBusAssignment: {
          include: {
            round: {
              include: { trip: { select: { id: true, name: true } } },
            },
            bus: { select: { id: true, name: true, licensePlate: true, capacity: true } },
          },
        },
      },
    })

    return assignments.map((a) => ({
      id: a.roundBusAssignment.round.id,
      name: a.roundBusAssignment.round.name,
      status: a.roundBusAssignment.round.status,
      departurePoint: a.roundBusAssignment.round.departurePoint,
      arrivalPoint: a.roundBusAssignment.round.arrivalPoint,
      scheduledDep: a.roundBusAssignment.round.scheduledDep,
      scheduledArr: a.roundBusAssignment.round.scheduledArr,
      operationalNote: a.roundBusAssignment.round.operationalNote,
      tripId: a.roundBusAssignment.round.tripId,
      trip: a.roundBusAssignment.round.trip,
      bus: a.roundBusAssignment.bus,
      busId: a.busId,
    }))
  }

  private async verifyBusManagerScope(
    userId: string,
    tripId: string,
    roundId: string,
    busId: string,
  ) {
    const assignment = await this.prisma.busManagerAssignment.findFirst({
      where: { userId, tripId, roundId, busId },
    })
    if (!assignment) {
      throw new ForbiddenException('BusManager is not assigned to this bus in this round')
    }
  }
}
