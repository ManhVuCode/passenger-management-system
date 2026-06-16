import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../../prisma/prisma.service'
import { CreatePassengerDto } from './dto/create-passenger.dto'
import { UpdatePassengerDto } from './dto/update-passenger.dto'
import { BulkCreatePassengerDto } from './dto/bulk-create-passenger.dto'
import { SheetSyncDto, SheetSyncMode } from './dto/sheet-sync.dto'

const DEFAULT_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  'ho ten': 'name',
  'họ tên': 'name',
  phone: 'phone',
  'so dien thoai': 'phone',
  'số điện thoại': 'phone',
  idcard: 'idCard',
  cccd: 'idCard',
  cmnd: 'idCard',
  type: 'type',
  loai: 'type',
  note: 'note',
  'ghi chu': 'note',
  'ghi chú': 'note',
}

@Injectable()
export class PassengerService {
  constructor(private prisma: PrismaService) {}

  async findAllByTrip(tripId: string, tenantId: string) {
    await this.verifyTrip(tripId, tenantId)
    return this.prisma.tripPassengerAssignment.findMany({
      where: { tripId, tenantId },
      orderBy: { createdAt: 'asc' },
    })
  }

  /** Đếm số hành khách theo từng trip trong phạm vi tenant chỉ bằng MỘT query (cho các view tổng hợp
   *  như chat snapshot) — tránh tình trạng N+1 khi fetch danh sách theo từng trip. */
  async countByTripForTenant(tenantId: string): Promise<Record<string, number>> {
    const groups = await this.prisma.tripPassengerAssignment.groupBy({
      by: ['tripId'],
      where: { tenantId },
      _count: { _all: true },
    })
    return Object.fromEntries(groups.map((g) => [g.tripId, g._count._all]))
  }

  async findOne(id: string, tenantId: string) {
    const passenger = await this.prisma.tripPassengerAssignment.findFirst({
      where: { id, tenantId },
    })
    if (!passenger) throw new NotFoundException('Passenger not found')
    return passenger
  }

  async create(tripId: string, tenantId: string, dto: CreatePassengerDto) {
    await this.verifyTrip(tripId, tenantId)
    return this.prisma.tripPassengerAssignment.create({
      data: { tripId, tenantId, ...dto },
    })
  }

  async bulkCreate(tripId: string, tenantId: string, dto: BulkCreatePassengerDto) {
    await this.verifyTrip(tripId, tenantId)
    const created = await this.prisma.$transaction(
      dto.passengers.map((p) =>
        this.prisma.tripPassengerAssignment.create({
          data: { tripId, tenantId, ...p },
        }),
      ),
    )
    return { created: created.length, passengers: created }
  }

  async update(id: string, tenantId: string, dto: UpdatePassengerDto) {
    await this.findOne(id, tenantId)
    return this.prisma.tripPassengerAssignment.update({
      where: { id },
      data: dto,
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    // Xóa kèm phân bổ round + điểm danh của hành khách (thứ tự phụ thuộc FK).
    const results = await this.prisma.$transaction([
      this.prisma.attendanceRecord.deleteMany({
        where: { roundPassengerAssignment: { tripPassengerAssignmentId: id } },
      }),
      this.prisma.roundPassengerAssignment.deleteMany({
        where: { tripPassengerAssignmentId: id },
      }),
      this.prisma.tripPassengerAssignment.delete({ where: { id } }),
    ])
    return results[results.length - 1]
  }

  async sheetSync(tripId: string, tenantId: string, dto: SheetSyncDto) {
    await this.verifyTrip(tripId, tenantId)

    if (dto.mode === SheetSyncMode.GENERATE) {
      return this.handleGenerateMode(tripId)
    }

    if (!dto.sheetUrl) {
      throw new BadRequestException('sheetUrl is required for IMPORT mode')
    }
    return this.handleImportMode(dto.sheetUrl, dto.columnMapping)
  }

  private handleGenerateMode(tripId: string) {
    return {
      mode: SheetSyncMode.GENERATE,
      message: 'Sheet template generated. Fill in the columns below and re-sync via IMPORT mode.',
      templateColumns: ['name', 'phone', 'idCard', 'type', 'note'],
      tripId,
      note: 'To integrate with Google Sheets API, set GOOGLE_SERVICE_ACCOUNT_JSON in env',
    }
  }

  private handleImportMode(sheetUrl: string, columnMapping?: Record<string, string>) {
    try {
      new URL(sheetUrl)
    } catch {
      throw new BadRequestException('Invalid sheet URL')
    }

    return {
      mode: SheetSyncMode.IMPORT,
      sheetUrl,
      detectedMapping: columnMapping ?? DEFAULT_COLUMN_MAP,
      message: 'Column mapping confirmed. Use POST /passengers/bulk to import parsed rows.',
      requiredColumns: ['name', 'phone'],
      optionalColumns: ['idCard', 'type', 'note'],
    }
  }

  async exportXlsx(tripId: string, tenantId: string): Promise<Buffer> {
    const passengers = await this.findAllByTrip(tripId, tenantId)

    const rows = passengers.map((p) => ({
      Name: p.name,
      Phone: p.phone,
      'ID Card': p.idCard ?? '',
      Type: p.type ?? '',
      Note: p.note ?? '',
      Created: new Date(p.createdAt).toLocaleDateString(),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Passengers')
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  }

  private async verifyTrip(tripId: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')
    return trip
  }
}
