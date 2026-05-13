import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AllocatePassengerDto } from './dto/allocate-passenger.dto'
import { MovePassengerDto } from './dto/move-passenger.dto'
import { RoundStatus } from '@pms/shared'

export interface AllocationResult {
  assigned: number
  assignments: unknown[]
  capacityWarning?: {
    busId: string
    capacity: number
    currentCount: number
    message: string
  }
}

@Injectable()
export class AllocationService {
  constructor(private prisma: PrismaService) {}

  async getAllocations(tripId: string, roundId: string, busId: string, tenantId: string) {
    await this.verifyRoundBusAssignment(tripId, roundId, busId, tenantId)

    return this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId, busId },
      include: {
        tripPassengerAssignment: {
          select: { id: true, name: true, phone: true, type: true, note: true },
        },
        attendanceRecord: {
          select: { status: true, markedAt: true },
        },
      },
    })
  }

  async getAllocationsByRound(tripId: string, roundId: string, tenantId: string) {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    return this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: {
        tripPassengerAssignment: {
          select: { id: true, name: true, phone: true, type: true, note: true },
        },
        roundBusAssignment: {
          select: { busId: true, bus: { select: { name: true, licensePlate: true } } },
        },
        attendanceRecord: {
          select: { id: true, status: true },
        },
      },
    })
  }

  async allocate(
    tripId: string,
    roundId: string,
    tenantId: string,
    dto: AllocatePassengerDto,
  ): Promise<AllocationResult> {
    await this.verifyRoundBusAssignment(tripId, roundId, dto.busId, tenantId)

    const passengers = await this.prisma.tripPassengerAssignment.findMany({
      where: { id: { in: dto.passengerIds }, tripId, tenantId },
    })
    if (passengers.length !== dto.passengerIds.length) {
      throw new NotFoundException('One or more passengers not found in this trip')
    }

    const existing = await this.prisma.roundPassengerAssignment.findMany({
      where: {
        tripId,
        roundId,
        tripPassengerAssignmentId: { in: dto.passengerIds },
      },
    })
    if (existing.length > 0) {
      const dup = existing.map((e) => e.tripPassengerAssignmentId)
      throw new ConflictException(
        `Passengers already allocated to a bus in this round: ${dup.join(', ')}`,
      )
    }

    const currentCount = await this.prisma.roundPassengerAssignment.count({
      where: { tripId, roundId, busId: dto.busId },
    })
    const newTotal = currentCount + dto.passengerIds.length
    const bus = await this.prisma.bus.findUnique({ where: { id: dto.busId } })

    let capacityWarning: AllocationResult['capacityWarning']
    if (bus && newTotal > bus.capacity) {
      capacityWarning = {
        busId: dto.busId,
        capacity: bus.capacity,
        currentCount: newTotal,
        message: `Bus capacity (${bus.capacity}) exceeded. Currently ${newTotal} passengers assigned.`,
      }
    }

    const assignments = await this.prisma.$transaction(
      dto.passengerIds.map((passengerId) =>
        this.prisma.roundPassengerAssignment.create({
          data: {
            tripPassengerAssignmentId: passengerId,
            tripId,
            roundId,
            busId: dto.busId,
          },
          include: {
            tripPassengerAssignment: { select: { name: true, phone: true, type: true } },
          },
        }),
      ),
    )

    return {
      assigned: assignments.length,
      assignments,
      ...(capacityWarning && { capacityWarning }),
    }
  }

  async removeAllocation(
    tripId: string,
    roundId: string,
    assignmentId: string,
    tenantId: string,
  ) {
    const rpa = await this.prisma.roundPassengerAssignment.findFirst({
      where: { id: assignmentId, tripId, roundId },
      include: {
        roundBusAssignment: { select: { tenantId: true } },
      },
    })

    if (!rpa || rpa.roundBusAssignment.tenantId !== tenantId) {
      throw new NotFoundException('Allocation not found')
    }

    return this.prisma.roundPassengerAssignment.delete({ where: { id: assignmentId } })
  }

  async movePassenger(
    tripId: string,
    roundId: string,
    assignmentId: string,
    tenantId: string,
    dto: MovePassengerDto,
  ) {
    const current = await this.prisma.roundPassengerAssignment.findFirst({
      where: { id: assignmentId, tripId, roundId },
      include: {
        roundBusAssignment: {
          include: { round: { select: { status: true, tenantId: true } } },
        },
      },
    })

    if (!current || current.roundBusAssignment.round.tenantId !== tenantId) {
      throw new NotFoundException('Allocation not found')
    }

    const roundStatus = current.roundBusAssignment.round.status as RoundStatus
    if (roundStatus !== RoundStatus.PLANNED) {
      throw new BadRequestException(
        `Cannot move passenger — round is ${roundStatus}. Movement only allowed before round starts (PLANNED).`,
      )
    }

    const targetRba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId: dto.toBusId } },
      include: { bus: true },
    })
    if (!targetRba) {
      throw new NotFoundException('Target bus not assigned to this round')
    }

    const targetCount = await this.prisma.roundPassengerAssignment.count({
      where: { tripId, roundId, busId: dto.toBusId },
    })
    const capacityWarning =
      targetCount + 1 > targetRba.bus.capacity
        ? {
            message: `Target bus capacity (${targetRba.bus.capacity}) will be exceeded after move.`,
            currentCount: targetCount + 1,
          }
        : undefined

    const updated = await this.prisma.roundPassengerAssignment.update({
      where: { id: assignmentId },
      data: { busId: dto.toBusId },
      include: {
        tripPassengerAssignment: { select: { name: true, phone: true } },
      },
    })

    return {
      moved: true,
      assignment: updated,
      ...(capacityWarning && { capacityWarning }),
    }
  }

  private async verifyRoundBusAssignment(
    tripId: string,
    roundId: string,
    busId: string,
    tenantId: string,
  ) {
    const rba = await this.prisma.roundBusAssignment.findUnique({
      where: { tripId_roundId_busId: { tripId, roundId, busId } },
      include: { round: true },
    })
    if (!rba || rba.tenantId !== tenantId) {
      throw new NotFoundException('Bus not assigned to this round')
    }
    return rba
  }
}
