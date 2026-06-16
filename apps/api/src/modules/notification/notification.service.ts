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
import { EMAIL_RE, PHONE_RE, TELEGRAM_ID_RE, redactContact, type NotificationTrigger, type RsvpIntent, type SendJobData } from './notification.types'

interface Recipient {
  id: string
  name: string
  phone: string
  telegramChatId: string | null
  contactOptOut: boolean
}

export interface NotificationResult {
  sent: number
  skipped: number
  channel: NotificationChannel
  devMode: boolean
  recipients: string[]
}

/** Tóm tắt trả về bởi nhánh gửi tự động/theo sự kiện. */
export interface DispatchResult {
  sent: number
  skipped: number
}

/** C5 — thống kê ý định lên xe cho broadcast voice (theo trip / round). */
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
      case NotificationChannel.TELEGRAM:
        return this.sendPerRecipient(ctx, recipients, dto.channel)
      default:
        throw new NotFoundException('Unsupported channel')
    }
  }

  /** Teams = một card tổng hợp duy nhất gửi tới kênh staff/ops; một dòng log. */
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

  /** In-app/broadcast = một cảnh báo WebSocket duy nhất tới các tài xế trong phòng trip. */
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
        // BROADCAST là tên cũ (alias) của IN_APP — lưu kênh chuẩn (canonical)
        // để bộ lọc lịch sử ?channel=IN_APP khớp cả hai.
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
      // Broadcast WebSocket luôn được kích hoạt bất kể key nào — không bao giờ là stub dev-mode.
      devMode: false,
      // Không gửi theo từng người nhận ở đây; trả về tên (không bao giờ số điện thoại thô) như nhánh Teams.
      recipients: recipients.map((r) => r.name),
    }
  }

  /** SMS/Voice/Telegram = theo từng người nhận, có lọc, đưa vào hàng đợi để gửi bất đồng bộ. */
  private async sendPerRecipient(
    ctx: SendContext,
    recipients: Recipient[],
    channel: NotificationChannel,
  ): Promise<NotificationResult> {
    let sent = 0
    let skipped = 0
    let capped = 0
    const accepted: string[] = []
    // C4 — kiểm soát chi phí: giới hạn fan-out voice để một broadcast không thể quay
    // số lượng cuộc gọi tính phí không giới hạn. SMS/Telegram không bị giới hạn.
    const cap = channel === NotificationChannel.VOICE ? this.voiceFanoutCap() : Number.POSITIVE_INFINITY

    for (const r of recipients) {
      if (sent >= cap) {
        skipped++
        capped++
        continue
      }
      // Telegram nhắn theo chat id riêng; số điện thoại KHÔNG phải đích Telegram nên không quay về phone.
      const contact = channel === NotificationChannel.TELEGRAM ? r.telegramChatId : r.phone
      const reason = this.rejectReason(r, contact, channel)
      if (reason || contact === null) {
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
    return { sent, skipped, channel, devMode: await this.isMockMode(channel, ctx.tenantId), recipients: accepted }
  }

  /** C4 — số cuộc gọi voice tối đa mỗi broadcast (kiểm soát chi phí). Tinh chỉnh qua env, mặc định 50. */
  private voiceFanoutCap(): number {
    const raw = Number(this.config.get<string>('VOICE_MAX_FANOUT'))
    return Number.isFinite(raw) && raw > 0 ? raw : 50
  }

  /** Trả về lý do từ chối cho bộ lọc người nhận A5, hoặc null nếu hợp lệ. */
  private rejectReason(r: Recipient, contact: string | null, channel: NotificationChannel): string | null {
    if (r.contactOptOut) return 'OPT_OUT'
    if (!contact) return 'NO_CONTACT'
    // Telegram chấp nhận chat id dạng số hoặc @username; SMS/voice chỉ chấp nhận số điện thoại.
    const valid =
      channel === NotificationChannel.TELEGRAM
        ? TELEGRAM_ID_RE.test(contact)
        : PHONE_RE.test(contact)
    return valid ? null : 'NO_CONTACT'
  }

  private async enqueueOrInline(job: SendJobData): Promise<void> {
    try {
      await this.queue.add('send-notification', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        // Xóa các job thất bại ngay lập tức — payload của chúng mang contact thô, và
        // dòng NotificationLog FAILED đã đóng vai trò bản ghi dead-letter.
        removeOnFail: true,
      })
    } catch (e) {
      // Redis/queue không khả dụng — chuyển sang gửi đồng bộ để demo vẫn hoạt động.
      this.logger.warn(`Queue unavailable, sending inline: ${(e as Error).message}`)
      try {
        await this.sender.deliver(job)
      } catch {
        /* deliver() đã đánh dấu dòng log là FAILED */
      }
    }
  }

  private async isMockMode(channel: NotificationChannel, tenantId: string): Promise<boolean> {
    // Telegram cấu hình theo từng nhà xe (token trong DB) — mock khi chưa có token.
    if (channel === NotificationChannel.TELEGRAM) {
      const cfg = await this.prisma.tenantNotificationConfig.findUnique({
        where: { tenantId },
        select: { telegramBotToken: true },
      })
      return !cfg?.telegramBotToken
    }
    const key = channel === NotificationChannel.VOICE ? 'VOICE_PROVIDER' : 'SMS_PROVIDER'
    return (this.config.get<string>(key) ?? 'MOCK').toUpperCase() === 'MOCK'
  }

  /**
   * B2/B5 — gửi tự động theo template cho từng hành khách trong một round.
   *
   * Được dùng bởi dispatcher theo sự kiện và scheduler nhắc lên xe (boarding-reminder).
   * Khác với sendToRound, nó KHÔNG BAO GIỜ ném lỗi khi round rỗng (automation phải im
   * lặng), render tin nhắn cá nhân hóa cho từng hành khách, và gửi qua SMS — kênh
   * tiếp cận hành khách chuẩn. Bên gọi chịu trách nhiệm kiểm tra cổng autoRules;
   * method này luôn gửi. Không bao giờ ghi AttendanceRecord.
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
          select: { id: true, name: true, phone: true, telegramChatId: true, contactOptOut: true },
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

  /** Cơ chế chống trùng lặp cho các trigger lặp lại (boarding reminder): true nếu đã
   * tồn tại một dòng non-FAILED cho recipient + trigger này trong hôm nay. */
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

  /** A8 — lịch sử thông báo của một trip, giới hạn theo tenant (R10). */
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


  /**
   * Email tự động: báo cáo điểm danh gửi tới các Admin của tenant khi một round
   * hoàn thành. Cổng autoRules.emailReport do dispatcher kiểm tra trước khi gọi.
   * Người nhận là User.email của Admin — KHÔNG phải hành khách (hành khách chưa
   * có trường email). Đi qua cùng pipeline queue/retry/log như mọi kênh khác.
   */
  async sendAttendanceReportEmail(params: {
    tripId: string
    roundId: string
    tenantId: string
  }): Promise<DispatchResult> {
    const { tripId, roundId, tenantId } = params
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
      include: { trip: { select: { name: true } } },
    })
    if (!round) return { sent: 0, skipped: 0 }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: {
        tripPassengerAssignment: { select: { name: true } },
        attendanceRecord: { select: { status: true } },
      },
    })
    const total = rpas.length
    const joined = rpas.filter((r) => r.attendanceRecord?.status === 'JOIN')
    const absentees = rpas.filter((r) => r.attendanceRecord?.status === 'ABSENT')
    const pending = rpas.filter((r) => !r.attendanceRecord)

    const subject = `[MPMS] Báo cáo điểm danh — ${round.trip.name} / chặng ${round.name}`
    const lines = [
      `Chặng "${round.name}" của chuyến "${round.trip.name}" đã hoàn thành.`,
      '',
      `Tổng hành khách: ${total}`,
      `Đã lên xe: ${joined.length}`,
      `Vắng mặt: ${absentees.length}`,
      `Chưa điểm danh: ${pending.length}`,
    ]
    if (absentees.length > 0) {
      lines.push('', 'Danh sách vắng mặt:')
      for (const r of absentees) lines.push(`  - ${r.tripPassengerAssignment.name}`)
    }
    if (pending.length > 0) {
      lines.push('', 'Chưa điểm danh:')
      for (const r of pending) lines.push(`  - ${r.tripPassengerAssignment.name}`)
    }
    const body = lines.join('\n')

    const admins = await this.prisma.user.findMany({
      where: { tenantId, role: 'ADMIN' },
      select: { email: true },
    })

    let sent = 0
    let skipped = 0
    for (const admin of admins) {
      if (!admin.email || !EMAIL_RE.test(admin.email)) {
        skipped++
        continue
      }
      const log = await this.prisma.notificationLog.create({
        data: {
          tenantId,
          tripId,
          roundId,
          channel: 'EMAIL',
          trigger: 'ROUND_COMPLETED',
          messageText: body,
          toContact: redactContact(admin.email),
          status: 'QUEUED',
        },
      })
      await this.enqueueOrInline({
        logId: log.id,
        channel: 'EMAIL',
        payload: { to: admin.email, body, tenantId, subject },
      })
      sent++
    }
    return { sent, skipped }
  }

  /** B4 — đọc các công tắc automation của tenant (mặc định tất cả là false). */
  async getAutoRules(tenantId: string): Promise<AutoRules> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({ where: { tenantId } })
    return resolveAutoRules(config?.autoRules)
  }

  /** B4 — gộp một cập nhật công tắc một phần lên rules hiện tại và lưu lại (R10). */
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
   * C3 — ghi phản hồi nhấn phím 1 qua IVR của hành khách thành một RSVP INTENT trên
   * dòng log voice. Giới hạn theo tenant (R10) và chỉ áp dụng cho các dòng VOICE. Đây là
   * hook "mô phỏng nhấn phím 1" cho demo và đúng hình dạng mà một webhook IVR thật sẽ
   * gọi. Nó CHỈ cập nhật NotificationLog.rsvp — KHÔNG BAO GIỜ tạo hay thay đổi một
   * AttendanceRecord (domain rules #5/#6: điểm danh thuộc về BusManager).
   */
  async setRsvpIntent(tenantId: string, logId: string, rsvp: RsvpIntent): Promise<NotificationLog> {
    // Phản hồi nhấn phím 1 chỉ có thể tồn tại với cuộc gọi thực sự được nghe máy, nên
    // chỉ cho phép ghi vào các dòng đã được trả lời. Điều này giữ getVoiceIntent nhất quán
    // (willBoard + wontBoard không bao giờ vượt quá số lượng answered).
    const log = await this.prisma.notificationLog.findFirst({
      where: { id: logId, tenantId, channel: 'VOICE', status: { in: ['DELIVERED', 'SENT'] } },
      select: { id: true },
    })
    if (!log) throw new NotFoundException('Answered voice call not found')
    return this.prisma.notificationLog.update({ where: { id: logId }, data: { rsvp } })
  }

  /** C5 — thống kê ý định lên xe trên các cuộc gọi voice của một trip (hoặc round) (R10). */
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
      else s.answered++ // SENT | DELIVERED (đã trả lời)
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

    const select = { id: true, name: true, phone: true, telegramChatId: true, contactOptOut: true }

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

/** Định dạng thời gian khởi hành thành `HH:mm DD/MM` cho template. */
function formatTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(date.getHours())}:${p(date.getMinutes())} ${p(date.getDate())}/${p(date.getMonth() + 1)}`
}
