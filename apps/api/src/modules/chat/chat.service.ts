import { Injectable } from '@nestjs/common'
import { TripService } from '../trip/trip.service'
import { PassengerService } from '../passenger/passenger.service'
import { BusService } from '../bus/bus.service'
import { ChatProviderRegistry } from './providers/chat-provider.registry'
import { ChatQueryDto } from './dto/chat-query.dto'
import { retrieveKnowledge } from './chat.knowledge'
import type { ChatAnswer, ChatContext, ChatLang, ChatStatusCounts, ChatTripSummary } from './chat.types'

function isoDate(d: Date | string): string {
  // Format from the date's own components (not UTC) so a local-midnight DateTime
  // can't shift the displayed calendar date by a day.
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
    // RAG: attach relevant domain-knowledge chunks (static docs, no PII/live data).
    context.knowledge = retrieveKnowledge(dto.message, lang)
    const provider = this.registry.resolve()
    const { answer } = await provider.answer(dto.message, context, lang)
    return { answer, provider: provider.key }
  }

  /**
   * Build the tenant-scoped (R10), PII-light snapshot. Every number is computed
   * here by deterministic queries; only aggregate counts + trip metadata are
   * included — passenger phone/idCard/name/note NEVER enter the snapshot (we use
   * only roster .length).
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
