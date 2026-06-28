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
    // SĐT tuỳ chọn — chỉ kiểm tra trùng chuyến giao thời gian khi có nhập SĐT.
    if (dto.phone) {
      const conflicts = await this.findPhoneConflicts(tripId, tenantId, trip, [dto.phone])
      const conflict = conflicts.get(dto.phone)
      if (conflict) throw new ConflictException(overlapMessage(dto.phone, conflict))
    }
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
      dto.passengers.map((p) => p.phone).filter((x): x is string => !!x),
    )

    // Chống trùng khi đồng bộ nhiều lần: bỏ qua hành khách đã có trong chuyến (hoặc trùng
    // ngay trong mẻ) theo khoá (Họ tên, SĐT, CCCD).
    const existing = await this.prisma.tripPassengerAssignment.findMany({
      where: { tripId, tenantId },
      select: { name: true, phone: true, idCard: true },
    })
    const seen = new Set(existing.map(dedupKey))

    const clean: typeof dto.passengers = []
    const skipped: SkippedPassenger[] = []
    for (const p of dto.passengers) {
      const conflict = p.phone ? conflicts.get(p.phone) : undefined
      if (conflict) {
        skipped.push({ name: p.name, phone: p.phone ?? '', ...conflict })
        continue
      }
      const key = dedupKey(p)
      if (seen.has(key)) {
        skipped.push({ name: p.name, phone: p.phone ?? '', tripName: DUP_IN_TRIP, dateRange: '' })
        continue
      }
      seen.add(key)
      clean.push(p)
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

    // Luôn xuất hàng tiêu đề (kể cả khi 0 hành khách) để người dùng biết các cột cần điền.
    const header = ['Name', 'Phone', 'Email', 'ID Card', 'Type', 'Note', 'Created']
    const rows = passengers.map((p) => [
      p.name,
      p.phone ?? '',
      p.email ?? '',
      p.idCard ?? '',
      p.type ?? '',
      p.note ?? '',
      new Date(p.createdAt).toLocaleDateString(),
    ])

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
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
      if (r.phone && !map.has(r.phone)) {
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

const DUP_IN_TRIP = 'Trùng — đã có trong chuyến'

/** Khoá chống trùng hành khách trong cùng chuyến: (Họ tên, SĐT, CCCD) đã chuẩn hoá. */
function dedupKey(p: { name?: string | null; phone?: string | null; idCard?: string | null }): string {
  return [p.name, p.phone, p.idCard].map((v) => (v ?? '').trim().toLowerCase()).join('|')
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
