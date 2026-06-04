import { Injectable } from '@nestjs/common'
import { TripService } from '../trip/trip.service'
import { PassengerService } from '../passenger/passenger.service'
import { BusService } from '../bus/bus.service'
import { ChatProviderRegistry } from './providers/chat-provider.registry'
import { ChatQueryDto } from './dto/chat-query.dto'
import { retrieveKnowledge } from './chat.knowledge'
import type { ChatAnswer, ChatContext, ChatLang, ChatStatusCounts, ChatTripSummary } from './chat.types'

function isoDate(d: Date | string): string {
  // Định dạng từ chính các thành phần của ngày (không phải UTC) để một DateTime nửa đêm theo giờ địa phương
  // không làm lệch ngày hiển thị đi một ngày.
  const dt = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

@Injectable()
export class ChatService {
  constructor(
    private readonly trips: TripService,
    private readonly passengers: PassengerService,
    private readonly buses: BusService,
    private readonly registry: ChatProviderRegistry,
  ) {}

  async ask(tenantId: string, dto: ChatQueryDto): Promise<ChatAnswer> {
    const lang: ChatLang = dto.lang ?? 'vi'
    const context = await this.buildContext(tenantId)
    // RAG: đính kèm các chunk tri thức nghiệp vụ liên quan (tài liệu tĩnh, không có PII/dữ liệu trực tiếp).
    context.knowledge = retrieveKnowledge(dto.message, lang)
    const provider = this.registry.resolve()
    const { answer } = await provider.answer(dto.message, context, lang)
    return { answer, provider: provider.key }
  }

  /**
   * Dựng snapshot theo phạm vi tenant (R10), hạn chế PII. Mọi con số đều được tính
   * tại đây bằng các truy vấn tất định; chỉ gồm số liệu tổng hợp + metadata của chuyến —
   * phone/idCard/name/note của hành khách KHÔNG BAO GIỜ lọt vào snapshot (ta chỉ dùng
   * .length của danh sách).
   */
  async buildContext(tenantId: string): Promise<ChatContext> {
    const [trips, passengerCounts, busCount] = await Promise.all([
      this.trips.findAll(tenantId),
      this.passengers.countByTripForTenant(tenantId),
      this.buses.countForTenant(tenantId),
    ])
    const statusCounts: ChatStatusCounts = { PLANNED: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 }
    const summaries: ChatTripSummary[] = trips.map((t) => {
      const status = t.status as keyof ChatStatusCounts
      if (status in statusCounts) statusCounts[status]++
      const rounds = (t as { rounds?: { status: string }[] }).rounds ?? []
      return {
        name: t.name,
        status: t.status,
        startDate: isoDate(t.startDate),
        endDate: isoDate(t.endDate),
        roundCount: rounds.length,
        roundsInProgress: rounds.filter((r) => r.status === 'IN_PROGRESS').length,
        passengerCount: passengerCounts[t.id] ?? 0,
        description: t.description ?? null,
      }
    })

    return {
      operatorTripCount: trips.length,
      busCount,
      statusCounts,
      trips: summaries,
      generatedAt: new Date().toISOString(),
    }
  }
}
