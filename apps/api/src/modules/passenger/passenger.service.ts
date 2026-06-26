import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
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
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
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
    const trip = await this.verifyTrip(tripId, tenantId)
    const conflicts = await this.findPhoneConflicts(tripId, tenantId, trip, [dto.phone])
    const conflict = conflicts.get(dto.phone)
    if (conflict) throw new ConflictException(overlapMessage(dto.phone, conflict))
    return this.prisma.tripPassengerAssignment.create({
      data: { tripId, tenantId, ...dto },
    })
  }

  async bulkCreate(tripId: string, tenantId: string, dto: BulkCreatePassengerDto) {
    const trip = await this.verifyTrip(tripId, tenantId)
    // Bỏ qua (không reject cả mẻ) các dòng có SĐT trùng chuyến giao thời gian — vẫn nhập
    // phần còn lại, rồi báo cáo danh sách bị bỏ qua để admin xử lý.
    const conflicts = await this.findPhoneConflicts(
      tripId,
      tenantId,
      trip,
      dto.passengers.map((p) => p.phone),
    )
    const clean: typeof dto.passengers = []
    const skipped: SkippedPassenger[] = []
    for (const p of dto.passengers) {
      const conflict = conflicts.get(p.phone)
      if (conflict) {
        skipped.push({ name: p.name, phone: p.phone, ...conflict })
      } else {
        clean.push(p)
      }
    }
    const created = clean.length
      ? await this.prisma.$transaction(
          clean.map((p) =>
            this.prisma.tripPassengerAssignment.create({
              data: { tripId, tenantId, ...p },
            }),
          ),
        )
      : []
    return { created: created.length, passengers: created, skipped }
  }

  async update(id: string, tenantId: string, dto: UpdatePassengerDto) {
    const existing = await this.findOne(id, tenantId)
    // Chỉ kiểm tra khi SĐT thực sự đổi — tránh tự chặn chính bản ghi đang sửa.
    if (dto.phone && dto.phone !== existing.phone) {
      const trip = await this.verifyTrip(existing.tripId, tenantId)
      const conflicts = await this.findPhoneConflicts(existing.tripId, tenantId, trip, [dto.phone])
      const conflict = conflicts.get(dto.phone)
      if (conflict) throw new ConflictException(overlapMessage(dto.phone, conflict))
    }
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
      templateColumns: ['name', 'phone', 'email', 'idCard', 'type', 'note'],
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
      optionalColumns: ['email', 'idCard', 'type', 'note'],
    }
  }

  async exportXlsx(tripId: string, tenantId: string): Promise<Buffer> {
    const passengers = await this.findAllByTrip(tripId, tenantId)

    const rows = passengers.map((p) => ({
      Name: p.name,
      Phone: p.phone,
      Email: p.email ?? '',
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

  /**
   * Một người không thể có mặt ở hai chuyến diễn ra cùng lúc, nên cùng một SĐT KHÔNG
   * được nằm ở hai chuyến có khoảng thời gian giao nhau (trong cùng nhà xe). Trả về map
   * phone → chuyến đang xung đột (chỉ giữ chuyến xung đột đầu tiên cho mỗi số).
   *
   * Giao thời gian khi: start(chuyến khác) ≤ end(chuyến đích) VÀ end(chuyến khác) ≥ start(chuyến đích).
   * Lưu ý: Trip.status được SUY RA lúc đọc (không lưu trong DB), nên ở đây lọc theo khoảng
   * ngày — không lọc theo status; chuyến đã hủy vẫn tính là xung đột (chấp nhận được, thiên
   * về phía an toàn theo yêu cầu "đảm bảo không trùng").
   */
  private async findPhoneConflicts(
    tripId: string,
    tenantId: string,
    trip: { startDate: Date; endDate: Date },
    phones: string[],
  ): Promise<Map<string, PhoneConflict>> {
    const unique = [...new Set(phones.filter(Boolean))]
    const map = new Map<string, PhoneConflict>()
    if (unique.length === 0) return map

    const rows = await this.prisma.tripPassengerAssignment.findMany({
      where: {
        tenantId,
        tripId: { not: tripId },
        phone: { in: unique },
        trip: {
          startDate: { lte: trip.endDate },
          endDate: { gte: trip.startDate },
        },
      },
      select: {
        phone: true,
        trip: { select: { name: true, startDate: true, endDate: true } },
      },
    })

    for (const r of rows) {
      if (!map.has(r.phone)) {
        map.set(r.phone, {
          tripName: r.trip.name,
          dateRange: fmtRange(r.trip.startDate, r.trip.endDate),
        })
      }
    }
    return map
  }

  private async verifyTrip(tripId: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new NotFoundException('Trip not found')
    return trip
  }
}

/** Một chuyến đang giữ SĐT trùng, dùng để dựng thông báo xung đột. */
export interface PhoneConflict {
  tripName: string
  dateRange: string
}

/** Dòng bị bỏ qua khi import hàng loạt do trùng SĐT với chuyến giao thời gian. */
export interface SkippedPassenger extends PhoneConflict {
  name: string
  phone: string
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

function fmtRange(start: Date, end: Date): string {
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

/** Thông báo 409 cho thao tác thêm/sửa 1 hành khách (hiển thị trực tiếp cho admin). */
function overlapMessage(phone: string, c: PhoneConflict): string {
  return `SĐT ${phone} đã thuộc chuyến "${c.tripName}" (${c.dateRange}) đang giao thời gian với chuyến này. Hãy đổi SĐT hoặc gỡ khỏi chuyến kia trước khi thêm.`
}
