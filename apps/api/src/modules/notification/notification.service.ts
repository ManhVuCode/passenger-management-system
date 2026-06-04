import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { Prisma, type NotificationLog } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AttendanceGateway } from '../../gateway/attendance.gateway'
import { SendNotificationDto, NotificationChannel } from './dto/send-notification.dto'
import { ProviderRegistry } from './providers/provider.registry'
import { NotificationSender } from './notification.sender'
import { TemplateService, type TemplateKey, type TemplateLocale } from './templates/template.service'
import { resolveAutoRules, type AutoRules } from './notification.config'
import { NOTIFICATION_QUEUE } from '../queue/queue.module'
import { PHONE_RE, ZALO_ID_RE, redactContact, type NotificationTrigger, type RsvpIntent, type SendJobData } from './notification.types'

interface Recipient {
  id: string
  name: string
  phone: string
  zaloId: string | null
  contactOptOut: boolean
}

export interface NotificationResult {
  sent: number
  skipped: number
  channel: NotificationChannel
  devMode: boolean
  recipients: string[]
}

/** Summary returned by the automated/event-driven send path. */
export interface DispatchResult {
  sent: number
  skipped: number
}

/** C5 — boarding-intent tally for the voice broadcast (per trip / round). */
export interface VoiceIntentSummary {
  total: number
  answered: number
  noAnswer: number
  pending: number
  failed: number
  willBoard: number
  wontBoard: number
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private gateway: AttendanceGateway,
    private registry: ProviderRegistry,
    private sender: NotificationSender,
    private templates: TemplateService,
    @InjectQueue(NOTIFICATION_QUEUE) private queue: Queue,
  ) {}

  async sendToRound(
    tripId: string,
    roundId: string,
    tenantId: string,
    dto: SendNotificationDto,
    trigger: NotificationTrigger = 'MANUAL',
  ): Promise<NotificationResult> {
    const recipients = await this.resolveRecipients(tripId, roundId, tenantId, dto.passengerIds)
    if (recipients.length === 0) {
      throw new NotFoundException('No passengers found in this round')
    }

    const ctx = { tenantId, tripId, roundId, message: dto.message, trigger }
    switch (dto.channel) {
      case NotificationChannel.TEAMS:
        return this.sendTeams(ctx, recipients)
      case NotificationChannel.BROADCAST:
      case NotificationChannel.IN_APP:
        return this.sendInApp(ctx, recipients, dto.channel)
      case NotificationChannel.SMS:
      case NotificationChannel.VOICE:
      case NotificationChannel.ZALO:
        return this.sendPerRecipient(ctx, recipients, dto.channel)
      default:
        throw new NotFoundException('Unsupported channel')
    }
  }

  /** Teams = single aggregate card to the staff/ops channel; one log row. */
  private async sendTeams(ctx: SendContext, recipients: Recipient[]): Promise<NotificationResult> {
    const provider = this.registry.get('TEAMS')
    const result = provider
      ? await provider.send({ to: 'teams', body: ctx.message, tenantId: ctx.tenantId })
      : { success: false, error: 'NO_PROVIDER' }
    await this.prisma.notificationLog.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        roundId: ctx.roundId,
        channel: 'TEAMS',
        trigger: ctx.trigger,
        messageText: ctx.message,
        toContact: 'teams',
        status: result.success ? 'SENT' : 'FAILED',
        providerId: result.providerId,
        errorReason: result.error,
      },
    })
    return {
      sent: recipients.length,
      skipped: 0,
      channel: NotificationChannel.TEAMS,
      devMode: !this.config.get<string>('TEAMS_WEBHOOK_URL'),
      recipients: recipients.map((r) => r.name),
    }
  }

  /** In-app/broadcast = single WebSocket alert to drivers in the trip room. */
  private async sendInApp(
    ctx: SendContext,
    recipients: Recipient[],
    channel: NotificationChannel,
  ): Promise<NotificationResult> {
    this.gateway.broadcastCallAlert({ tripId: ctx.tripId, message: ctx.message })
    await this.prisma.notificationLog.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        roundId: ctx.roundId,
        // BROADCAST is a legacy alias of IN_APP — persist the canonical channel
        // so a ?channel=IN_APP history filter matches both.
        channel: 'IN_APP',
        trigger: ctx.trigger,
        messageText: ctx.message,
        toContact: 'in-app',
        status: 'SENT',
        providerId: 'ws',
      },
    })
    return {
      sent: recipients.length,
      skipped: 0,
      channel,
      // The WebSocket broadcast fires regardless of any key — never a dev-mode stub.
      devMode: false,
      // No per-recipient delivery here; report names (never raw phones) like the Teams path.
      recipients: recipients.map((r) => r.name),
    }
  }

  /** SMS/Voice/Zalo = per-recipient, filtered, queued for async delivery. */
  private async sendPerRecipient(
    ctx: SendContext,
    recipients: Recipient[],
    channel: NotificationChannel,
  ): Promise<NotificationResult> {
    let sent = 0
    let skipped = 0
    let capped = 0
    const accepted: string[] = []
    // C4 — cost guard: cap voice fan-out so one broadcast can't dial an unbounded
    // number of paid calls. SMS/Zalo are uncapped.
    const cap = channel === NotificationChannel.VOICE ? this.voiceFanoutCap() : Number.POSITIVE_INFINITY

    for (const r of recipients) {
      if (sent >= cap) {
        skipped++
        capped++
        continue
      }
      // `||` (not `??`) so an empty-string zaloId also falls back to the phone.
      const contact = channel === NotificationChannel.ZALO ? (r.zaloId || r.phone) : r.phone
      const reason = this.rejectReason(r, contact, channel)
      if (reason) {
        skipped++
        await this.prisma.notificationLog.create({
          data: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            roundId: ctx.roundId,
            channel,
            trigger: ctx.trigger,
            messageText: ctx.message,
            recipientRef: r.id,
            toContact: redactContact(contact ?? ''),
            status: 'FAILED',
            errorReason: reason,
          },
        })
        continue
      }

      const log = await this.prisma.notificationLog.create({
        data: {
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          roundId: ctx.roundId,
          channel,
          trigger: ctx.trigger,
          messageText: ctx.message,
          recipientRef: r.id,
          toContact: redactContact(contact),
          status: 'QUEUED',
        },
      })
      await this.enqueueOrInline({
        logId: log.id,
        channel,
        payload: { to: contact, body: ctx.message, tenantId: ctx.tenantId },
      })
      sent++
      accepted.push(redactContact(contact))
    }

    if (capped > 0) {
      this.logger.warn(
        `VOICE fan-out capped at ${cap}: ${capped} recipient(s) not called for round ${ctx.roundId}`,
      )
    }
    return { sent, skipped, channel, devMode: this.isMockMode(channel), recipients: accepted }
  }

  /** C4 — max voice calls per broadcast (cost guard). Env-tunable, default 50. */
  private voiceFanoutCap(): number {
    const raw = Number(this.config.get<string>('VOICE_MAX_FANOUT'))
    return Number.isFinite(raw) && raw > 0 ? raw : 50
  }

  /** Returns a rejection reason for A5 recipient filtering, or null if valid. */
  private rejectReason(r: Recipient, contact: string | null, channel: NotificationChannel): string | null {
    if (r.contactOptOut) return 'OPT_OUT'
    if (!contact) return 'NO_CONTACT'
    // Zalo accepts a numeric OA user id (longer than a phone) or a phone fallback;
    // SMS/voice only accept a phone.
    const valid =
      channel === NotificationChannel.ZALO
        ? ZALO_ID_RE.test(contact) || PHONE_RE.test(contact)
        : PHONE_RE.test(contact)
    return valid ? null : 'NO_CONTACT'
  }

  private async enqueueOrInline(job: SendJobData): Promise<void> {
    try {
      await this.queue.add('send-notification', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        // Evict failed jobs immediately — their payload carries the raw contact, and the
        // FAILED NotificationLog row already doubles as the dead-letter record.
        removeOnFail: true,
      })
    } catch (e) {
      // Redis/queue unavailable — degrade to synchronous send so the demo still works.
      this.logger.warn(`Queue unavailable, sending inline: ${(e as Error).message}`)
      try {
        await this.sender.deliver(job)
      } catch {
        /* deliver() already marked the log row FAILED */
      }
    }
  }

  private isMockMode(channel: NotificationChannel): boolean {
    const key =
      channel === NotificationChannel.VOICE
        ? 'VOICE_PROVIDER'
        : channel === NotificationChannel.ZALO
          ? 'ZALO_PROVIDER'
          : 'SMS_PROVIDER'
    return (this.config.get<string>(key) ?? 'MOCK').toUpperCase() === 'MOCK'
  }

  /**
   * B2/B5 — automated, per-passenger templated send for a round.
   *
   * Used by the event-driven dispatcher and the boarding-reminder scheduler.
   * Unlike sendToRound it NEVER throws on an empty round (automation must stay
   * silent), renders a personalized message per passenger, and goes out over SMS
   * — the canonical passenger reach channel. Caller is responsible for the
   * autoRules gate; this method always sends. Never writes AttendanceRecord.
   */
  async sendAutomated(params: {
    tripId: string
    roundId: string
    tenantId: string
    trigger: NotificationTrigger
    templateKey: TemplateKey
    locale?: TemplateLocale
    dedupe?: boolean
  }): Promise<DispatchResult> {
    const { tripId, roundId, tenantId, trigger, templateKey } = params
    const locale = params.locale ?? 'vi'
    const channel = NotificationChannel.SMS

    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
      include: { trip: { select: { name: true } } },
    })
    if (!round) return { sent: 0, skipped: 0 }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: {
        tripPassengerAssignment: {
          select: { id: true, name: true, phone: true, zaloId: true, contactOptOut: true },
        },
        roundBusAssignment: { include: { bus: { select: { licensePlate: true } } } },
      },
    })

    let sent = 0
    let skipped = 0
    for (const rpa of rpas) {
      const p = rpa.tripPassengerAssignment
      const contact = p.phone

      if (params.dedupe && (await this.alreadySentToday(tenantId, roundId, p.id, trigger))) {
        continue
      }

      const body = this.templates.render(
        templateKey,
        {
          passengerName: p.name,
          tripName: round.trip.name,
          roundName: round.name,
          busPlate: rpa.roundBusAssignment.bus.licensePlate,
          departureTime: formatTime(round.scheduledDep),
        },
        locale,
      )

      const reason = this.rejectReason(p, contact, channel)
      if (reason) {
        skipped++
        await this.prisma.notificationLog.create({
          data: {
            tenantId, tripId, roundId, channel, trigger, templateKey,
            messageText: body,
            recipientRef: p.id,
            toContact: redactContact(contact ?? ''),
            status: 'FAILED',
            errorReason: reason,
          },
        })
        continue
      }

      const log = await this.prisma.notificationLog.create({
        data: {
          tenantId, tripId, roundId, channel, trigger, templateKey,
          messageText: body,
          recipientRef: p.id,
          toContact: redactContact(contact),
          status: 'QUEUED',
        },
      })
      await this.enqueueOrInline({
        logId: log.id,
        channel,
        payload: { to: contact, body, tenantId, templateKey },
      })
      sent++
    }

    return { sent, skipped }
  }

  /** Dedup guard for repeating triggers (boarding reminder): true if a non-FAILED
   * row already exists for this recipient + trigger today. */
  private async alreadySentToday(
    tenantId: string,
    roundId: string,
    recipientRef: string,
    trigger: NotificationTrigger,
  ): Promise<boolean> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const existing = await this.prisma.notificationLog.findFirst({
      where: {
        tenantId, roundId, recipientRef, trigger,
        status: { not: 'FAILED' },
        createdAt: { gte: startOfDay },
      },
      select: { id: true },
    })
    return existing !== null
  }

  /** A8 — notification history for a trip, tenant-scoped (R10). */
  async getHistory(
    tripId: string,
    tenantId: string,
    opts: { roundId?: string; channel?: string; limit?: number },
  ): Promise<NotificationLog[]> {
    const take = opts.limit && opts.limit > 0 && opts.limit <= 200 ? opts.limit : 50
    return this.prisma.notificationLog.findMany({
      where: {
        tenantId,
        tripId,
        ...(opts.roundId ? { roundId: opts.roundId } : {}),
        ...(opts.channel ? { channel: opts.channel } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })
  }

  /** B4 — read the tenant's automation toggles (all-false default). */
  async getAutoRules(tenantId: string): Promise<AutoRules> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({ where: { tenantId } })
    return resolveAutoRules(config?.autoRules)
  }

  /** B4 — merge a partial toggle update over current rules and persist (R10). */
  async updateAutoRules(tenantId: string, patch: Partial<AutoRules>): Promise<AutoRules> {
    const current = await this.getAutoRules(tenantId)
    const next: AutoRules = { ...current, ...patch }
    const config = await this.prisma.tenantNotificationConfig.upsert({
      where: { tenantId },
      create: { tenantId, autoRules: next as unknown as Prisma.InputJsonValue },
      update: { autoRules: next as unknown as Prisma.InputJsonValue },
    })
    return resolveAutoRules(config.autoRules)
  }

  /**
   * C3 — record a passenger's IVR press-1 reply as an RSVP INTENT on the voice
   * log row. Tenant-scoped (R10) and restricted to VOICE rows. This is the
   * "simulate press-1" hook for the demo and the shape a real IVR webhook would
   * call. It ONLY updates NotificationLog.rsvp — it NEVER creates or mutates an
   * AttendanceRecord (domain rules #5/#6: attendance stays with the BusManager).
   */
  async setRsvpIntent(tenantId: string, logId: string, rsvp: RsvpIntent): Promise<NotificationLog> {
    // A press-1 reply can only exist for a call that was actually answered, so
    // restrict the write to answered rows. This keeps getVoiceIntent consistent
    // (willBoard + wontBoard can never exceed the answered count).
    const log = await this.prisma.notificationLog.findFirst({
      where: { id: logId, tenantId, channel: 'VOICE', status: { in: ['DELIVERED', 'SENT'] } },
      select: { id: true },
    })
    if (!log) throw new NotFoundException('Answered voice call not found')
    return this.prisma.notificationLog.update({ where: { id: logId }, data: { rsvp } })
  }

  /** C5 — boarding-intent tally over a trip's (or round's) voice calls (R10). */
  async getVoiceIntent(
    tripId: string,
    tenantId: string,
    roundId?: string,
  ): Promise<VoiceIntentSummary> {
    const rows = await this.prisma.notificationLog.findMany({
      where: { tenantId, tripId, channel: 'VOICE', ...(roundId ? { roundId } : {}) },
      select: { status: true, rsvp: true },
    })
    const s: VoiceIntentSummary = {
      total: rows.length,
      answered: 0,
      noAnswer: 0,
      pending: 0,
      failed: 0,
      willBoard: 0,
      wontBoard: 0,
    }
    for (const r of rows) {
      if (r.rsvp === 'WILL_BOARD') s.willBoard++
      else if (r.rsvp === 'WONT_BOARD') s.wontBoard++

      if (r.status === 'NO_ANSWER') s.noAnswer++
      else if (r.status === 'QUEUED') s.pending++
      else if (r.status === 'FAILED' || r.status === 'BOUNCED') s.failed++
      else s.answered++ // SENT | DELIVERED
    }
    return s
  }

  private async resolveRecipients(
    tripId: string,
    roundId: string,
    tenantId: string,
    passengerIds?: string[],
  ): Promise<Recipient[]> {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    const select = { id: true, name: true, phone: true, zaloId: true, contactOptOut: true }

    if (passengerIds?.length) {
      return this.prisma.tripPassengerAssignment.findMany({
        where: { id: { in: passengerIds }, tripId, tenantId },
        select,
      })
    }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: { tripPassengerAssignment: { select } },
    })
    return rpas.map((r) => r.tripPassengerAssignment)
  }
}

interface SendContext {
  tenantId: string
  tripId: string
  roundId: string
  message: string
  trigger: NotificationTrigger
}

/** Format a departure time as `HH:mm DD/MM` for templates. */
function formatTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(date.getHours())}:${p(date.getMinutes())} ${p(date.getDate())}/${p(date.getMonth() + 1)}`
}
