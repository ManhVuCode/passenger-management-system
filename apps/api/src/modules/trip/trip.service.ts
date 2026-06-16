import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { TripStatus, RoundStatus } from '@pms/shared'

@Injectable()
export class TripService {
  constructor(private prisma: PrismaService) {}

  async deriveTripStatus(tripId: string): Promise<TripStatus> {
    const rounds = await this.prisma.round.findMany({
      where: { tripId },
      select: { status: true },
    })

    if (rounds.length === 0) return TripStatus.PLANNED

    const statuses = rounds.map((r) => r.status)

    if (statuses.some((s) => s === RoundStatus.IN_PROGRESS)) return TripStatus.IN_PROGRESS
    if (statuses.every((s) => s === RoundStatus.CANCELLED)) return TripStatus.CANCELLED
    if (statuses.every((s) => s === RoundStatus.DONE || s === RoundStatus.CANCELLED)) return TripStatus.DONE
    return TripStatus.PLANNED
  }

  async findAll(tenantId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { tenantId },
      orderBy: { startDate: 'asc' },
      include: { rounds: { select: { status: true } } },
    })

    return Promise.all(
      trips.map(async (trip) => ({
        ...trip,
        status: await this.deriveTripStatus(trip.id),
      })),
    )
  }

  async findOne(id: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, tenantId },
      include: { rounds: { orderBy: { sequence: 'asc' } } },
    })
    if (!trip) throw new NotFoundException('Trip not found')

    return { ...trip, status: await this.deriveTripStatus(id) }
  }

  async create(tenantId: string, dto: CreateTripDto) {
    if (dto.name.includes('/')) {
      throw new BadRequestException('Trip name must not contain "/"')
    }
    return this.prisma.trip.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'PLANNED',
      },
    })
  }

  async update(id: string, tenantId: string, dto: UpdateTripDto) {
    await this.findOne(id, tenantId)
    if (dto.name?.includes('/')) {
      throw new BadRequestException('Trip name must not contain "/"')
    }
    return this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    // Xóa dây chuyền theo thứ tự phụ thuộc FK (schema không khai báo onDelete: Cascade).
    // NotificationLog giữ nguyên — tripId/roundId chỉ là cột string, đóng vai trò audit trail.
    const results = await this.prisma.$transaction([
      this.prisma.attendanceRecord.deleteMany({
        where: { roundPassengerAssignment: { tripId: id } },
      }),
      this.prisma.roundPassengerAssignment.deleteMany({ where: { tripId: id } }),
      this.prisma.busManagerAssignment.deleteMany({ where: { tripId: id } }),
      this.prisma.roundBusAssignment.deleteMany({ where: { tripId: id } }),
      this.prisma.tripPassengerAssignment.deleteMany({ where: { tripId: id } }),
      this.prisma.round.deleteMany({ where: { tripId: id } }),
      this.prisma.trip.delete({ where: { id } }),
    ])
    return results[results.length - 1]
  }
}
