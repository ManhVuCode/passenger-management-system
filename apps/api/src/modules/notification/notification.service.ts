import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import * as XLSX from 'xlsx'
import { Prisma, type NotificationLog } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AttendanceGateway } from '../../gateway/attendance.gateway'
import { TelegramApiService } from '../telegram/telegram-api.service'
import { TelegramPollerService } from '../telegram/telegram-poller.service'
import { SendNotificationDto, NotificationChannel } from './dto/send-notification.dto'
import { ProviderRegistry } from './providers/provider.registry'
import { NotificationSender } from './notification.sender'
import { TemplateService, type TemplateKey, type TemplateLocale } from './templates/template.service'
import { resolveAutoRules, type AutoRules } from './notification.config'
import { NOTIFICATION_QUEUE } from '../queue/queue.module'
import { EMAIL_RE, PHONE_RE, TELEGRAM_ID_RE, redactContact, type NotificationTrigger, type SendJobData } from './notification.types'

interface Recipient {
  id: string
  name: string
  phone: string
  email: string | null
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

/** Trạng thái bot Telegram của tenant cho UI (không bao giờ chứa token thô). */
export interface TelegramConfigView {
  configured: boolean
  botUsername: string | null
  registrationLink: string | null
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
    private telegramApi: TelegramApiService,
    private poller: TelegramPollerService,
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
      case NotificationChannel.BROADCAST:
      case NotificationChannel.IN_APP:
        return this.sendInApp(ctx, recipients, dto.channel)
      case NotificationChannel.SMS:
      case NotificationChannel.TELEGRAM:
        return this.sendPerRecipient(ctx, recipients, dto.channel)
      case NotificationChannel.EMAIL:
        return this.sendEmailToPassengers(ctx, recipients)
      default:
        throw new NotFoundException('Unsupported channel')
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
      // Không gửi theo từng người nhận ở đây; trả về tên (không bao giờ số điện thoại thô).
      recipients: recipients.map((r) => r.name),
    }
  }

  /** SMS/Telegram = theo từng người nhận, có lọc, đưa vào hàng đợi để gửi bất đồng bộ. */
  private async sendPerRecipient(
    ctx: SendContext,
    recipients: Recipient[],
    channel: NotificationChannel,
  ): Promise<NotificationResult> {
    let sent = 0
    let skipped = 0
    const accepted: string[] = []

    for (const r of recipients) {
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

    return { sent, skipped, channel, devMode: await this.isMockMode(channel, ctx.tenantId), recipients: accepted }
  }

  /**
   * Gửi email nội dung tự do của admin cho hành khách CỦA round có địa chỉ email hợp lệ.
   * Hành khách không có email (hoặc đã opt-out) bị bỏ qua và đếm vào `skipped` — không
   * tạo dòng log FAILED để tránh nhiễu (việc thiếu email là bình thường). Đi qua cùng
   * pipeline queue/log như các kênh khác.
   */
  private async sendEmailToPassengers(
    ctx: SendContext,
    recipients: Recipient[],
  ): Promise<NotificationResult> {
    const round = await this.prisma.round.findFirst({
      where: { id: ctx.roundId, tripId: ctx.tripId, tenantId: ctx.tenantId },
      include: { trip: { select: { name: true } } },
    })
    const subject = round
      ? `[MPMS] Thông báo — ${round.trip.name} / ${round.name}`
      : '[MPMS] Thông báo cho hành khách'

    let sent = 0
    let skipped = 0
    const accepted: string[] = []
    for (const r of recipients) {
      const email = r.email?.trim() ?? ''
      if (r.contactOptOut || !email || !EMAIL_RE.test(email)) {
        skipped++
        continue
      }
      const log = await this.prisma.notificationLog.create({
        data: {
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          roundId: ctx.roundId,
          channel: 'EMAIL',
          trigger: ctx.trigger,
          messageText: ctx.message,
          recipientRef: r.id,
          toContact: redactContact(email),
          status: 'QUEUED',
        },
      })
      await this.enqueueOrInline({
        logId: log.id,
        channel: 'EMAIL',
        payload: { to: email, body: ctx.message, tenantId: ctx.tenantId, subject },
      })
      sent++
      accepted.push(redactContact(email))
    }
    return {
      sent,
      skipped,
      channel: NotificationChannel.EMAIL,
      devMode: await this.isMockMode(NotificationChannel.EMAIL, ctx.tenantId),
      recipients: accepted,
    }
  }

  /** Đếm hành khách của round có/không có email hợp lệ — cho UI cảnh báo trước khi gửi. */
  async getEmailEligibility(
    tripId: string,
    roundId: string,
    tenantId: string,
  ): Promise<{ total: number; withEmail: number; withoutEmail: number }> {
    const recipients = await this.resolveRecipients(tripId, roundId, tenantId)
    const withEmail = recipients.filter(
      (r) => !r.contactOptOut && r.email && EMAIL_RE.test(r.email.trim()),
    ).length
    return { total: recipients.length, withEmail, withoutEmail: recipients.length - withEmail }
  }

  /** Trả về lý do từ chối cho bộ lọc người nhận A5, hoặc null nếu hợp lệ. */
  private rejectReason(r: Recipient, contact: string | null, channel: NotificationChannel): string | null {
    if (r.contactOptOut) return 'OPT_OUT'
    if (!contact) return 'NO_CONTACT'
    // Telegram chấp nhận chat id dạng số hoặc @username; SMS chỉ chấp nhận số điện thoại.
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
    // Email: thật khi EMAIL_PROVIDER=BREVO và có đủ BREVO_API_KEY + EMAIL_FROM; còn lại là mock.
    if (channel === NotificationChannel.EMAIL) {
      const provider = (this.config.get<string>('EMAIL_PROVIDER') ?? 'MOCK').toUpperCase()
      if (provider !== 'BREVO') return true
      return !this.config.get<string>('BREVO_API_KEY') || !this.config.get<string>('EMAIL_FROM')
    }
    // Telegram cấu hình theo từng nhà xe (token trong DB) — mock khi chưa có token.
    if (channel === NotificationChannel.TELEGRAM) {
      const cfg = await this.prisma.tenantNotificationConfig.findUnique({
        where: { tenantId },
        select: { telegramBotToken: true },
      })
      return !cfg?.telegramBotToken
    }
    return (this.config.get<string>('SMS_PROVIDER') ?? 'MOCK').toUpperCase() === 'MOCK'
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

    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
      include: { trip: { select: { name: true } } },
    })
    if (!round) return { sent: 0, skipped: 0 }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: {
        tripPassengerAssignment: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            telegramChatId: true,
            channelPref: true,
            contactOptOut: true,
          },
        },
        roundBusAssignment: { include: { bus: { select: { licensePlate: true } } } },
      },
    })

    let sent = 0
    let skipped = 0
    for (const rpa of rpas) {
      const p = rpa.tripPassengerAssignment
      // B6 — định tuyến theo sở thích hành khách: ưu tiên Telegram khi khách chọn
      // channelPref=TELEGRAM và đã liên kết chat id; còn lại dùng SMS (kênh mặc định).
      const useTelegram = p.channelPref === 'TELEGRAM' && !!p.telegramChatId
      const channel = useTelegram ? NotificationChannel.TELEGRAM : NotificationChannel.SMS
      const contact = useTelegram ? p.telegramChatId! : p.phone

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

  /**
   * Email tự động cuối CHUYẾN: khi tất cả các chặng đã kết thúc (Trip.status suy ra =
   * DONE), gửi MỘT email kèm tệp .xlsx tổng hợp điểm danh toàn chuyến tới các Admin của
   * tenant. BỔ SUNG cho báo cáo text per-round ở trên (không thay thế). Dispatcher kiểm
   * tra cổng emailReport + điều kiện "cả chuyến đã xong" trước khi gọi.
   */
  async sendTripAttendanceReportEmail(params: {
    tripId: string
    tenantId: string
  }): Promise<DispatchResult> {
    const { tripId, tenantId } = params
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, tenantId },
      select: { name: true },
    })
    if (!trip) return { sent: 0, skipped: 0 }

    const rounds = await this.prisma.round.findMany({
      where: { tripId, tenantId },
      orderBy: { sequence: 'asc' },
      select: { id: true, name: true, sequence: true },
    })
    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId },
      include: {
        tripPassengerAssignment: { select: { id: true, name: true, phone: true } },
        attendanceRecord: { select: { status: true } },
      },
    })

    const { buffer, totals } = buildAttendanceWorkbook(rounds, rpas)
    const contentBase64 = buffer.toString('base64')
    const filename = `diem-danh-${slugify(trip.name)}.xlsx`

    const subject = `[MPMS] Báo cáo điểm danh — chuyến "${trip.name}"`
    const body = [
      `Chuyến "${trip.name}" đã kết thúc.`,
      '',
      `Số chặng: ${rounds.length}`,
      `Tổng lượt điểm danh: ${totals.total}`,
      `Có mặt: ${totals.join} · Vắng: ${totals.absent} · Hủy: ${totals.cancelled} · Chưa điểm danh: ${totals.pending}`,
      '',
      'Bảng chi tiết theo từng chặng nằm trong tệp Excel đính kèm.',
    ].join('\n')

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
          channel: 'EMAIL',
          trigger: 'TRIP_COMPLETED',
          messageText: body,
          toContact: redactContact(admin.email),
          status: 'QUEUED',
        },
      })
      await this.enqueueOrInline({
        logId: log.id,
        channel: 'EMAIL',
        payload: {
          to: admin.email,
          body,
          tenantId,
          subject,
          attachments: [{ filename, contentBase64 }],
        },
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

  /** D1 — trạng thái bot Telegram của tenant + link đăng ký (không trả token thô). */
  async getTelegramConfig(tenantId: string): Promise<TelegramConfigView> {
    const cfg = await this.prisma.tenantNotificationConfig.findUnique({
      where: { tenantId },
      select: { telegramBotToken: true, telegramBotUsername: true },
    })
    const botUsername = cfg?.telegramBotUsername ?? null
    return {
      configured: !!cfg?.telegramBotToken,
      botUsername,
      registrationLink: botUsername ? `https://t.me/${botUsername}` : null,
    }
  }

  /**
   * D1 — lưu bot token cho tenant: xác thực qua getMe (lấy luôn @username để dựng link/QR),
   * upsert vào TenantNotificationConfig rồi bật poller NGAY (không cần restart API).
   * Token sai → 400.
   */
  async setTelegramConfig(tenantId: string, botToken: string): Promise<TelegramConfigView> {
    const token = botToken.trim()
    const me = await this.telegramApi.getMe(token)
    if (!me) throw new BadRequestException('Telegram bot token không hợp lệ')
    await this.prisma.tenantNotificationConfig.upsert({
      where: { tenantId },
      create: { tenantId, telegramBotToken: token, telegramBotUsername: me.username },
      update: { telegramBotToken: token, telegramBotUsername: me.username },
    })
    this.poller.startForTenant(tenantId, token)
    return this.getTelegramConfig(tenantId)
  }

  /** D1 — gỡ bot token của tenant + dừng poller. Kênh Telegram trở về MOCK. */
  async clearTelegramConfig(tenantId: string): Promise<TelegramConfigView> {
    await this.prisma.tenantNotificationConfig.updateMany({
      where: { tenantId },
      data: { telegramBotToken: null, telegramBotUsername: null },
    })
    this.poller.stopForTenant(tenantId)
    return this.getTelegramConfig(tenantId)
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

    const select = { id: true, name: true, phone: true, email: true, telegramChatId: true, contactOptOut: true }

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

type ReportRound = { id: string; name: string; sequence: number }
type ReportRpa = {
  roundId: string
  tripPassengerAssignment: { id: string; name: string; phone: string }
  attendanceRecord: { status: string } | null
}

/**
 * Dựng workbook .xlsx báo cáo điểm danh toàn chuyến: sheet "Điểm danh" dạng ma trận
 * hành khách × chặng + sheet "Tổng hợp" theo từng chặng. Trả về buffer và tổng số liệu
 * để dựng phần thân email.
 */
function buildAttendanceWorkbook(
  rounds: ReportRound[],
  rpas: ReportRpa[],
): {
  buffer: Buffer
  totals: { total: number; join: number; absent: number; cancelled: number; pending: number }
} {
  const statusVN = (s?: string | null): string =>
    s === 'JOIN' ? 'Có mặt' : s === 'ABSENT' ? 'Vắng' : s === 'CANCELLED' ? 'Hủy' : 'Chưa điểm danh'
  const colName = (r: ReportRound): string => `${r.sequence}. ${r.name}`
  type Bucket = 'join' | 'absent' | 'cancelled' | 'pending'
  const bucketOf = (s?: string | null): Bucket =>
    s === 'JOIN' ? 'join' : s === 'ABSENT' ? 'absent' : s === 'CANCELLED' ? 'cancelled' : 'pending'

  const byPassenger = new Map<string, { name: string; phone: string; perRound: Map<string, string> }>()
  const totals = { total: 0, join: 0, absent: 0, cancelled: 0, pending: 0 }
  const roundTotals = new Map<
    string,
    { total: number; join: number; absent: number; cancelled: number; pending: number }
  >()
  for (const r of rounds) roundTotals.set(r.id, { total: 0, join: 0, absent: 0, cancelled: 0, pending: 0 })

  for (const rpa of rpas) {
    const p = rpa.tripPassengerAssignment
    let entry = byPassenger.get(p.id)
    if (!entry) {
      entry = { name: p.name, phone: p.phone, perRound: new Map() }
      byPassenger.set(p.id, entry)
    }
    const status = rpa.attendanceRecord?.status ?? null
    entry.perRound.set(rpa.roundId, statusVN(status))

    const bucket = bucketOf(status)
    totals.total++
    totals[bucket]++
    const rt = roundTotals.get(rpa.roundId)
    if (rt) {
      rt.total++
      rt[bucket]++
    }
  }

  const matrixRows = [...byPassenger.values()].map((entry) => {
    const row: Record<string, string | number> = { 'Hành khách': entry.name, SĐT: entry.phone }
    for (const r of rounds) row[colName(r)] = entry.perRound.get(r.id) ?? '—'
    return row
  })
  const ws1 = XLSX.utils.json_to_sheet(
    matrixRows.length ? matrixRows : [{ 'Hành khách': '(không có hành khách)' }],
  )

  const summaryRows = rounds.map((r) => {
    const rt = roundTotals.get(r.id)!
    return {
      Chặng: colName(r),
      Tổng: rt.total,
      'Có mặt': rt.join,
      Vắng: rt.absent,
      Hủy: rt.cancelled,
      'Chưa điểm danh': rt.pending,
    }
  })
  const ws2 = XLSX.utils.json_to_sheet(
    summaryRows.length ? summaryRows : [{ Chặng: '(không có chặng)' }],
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Điểm danh')
  XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp')
  const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  return { buffer, totals }
}

/** Chuẩn hóa tên chuyến thành slug an toàn cho tên tệp (bỏ dấu tiếng Việt). */
function slugify(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return base || 'chuyen'
}
