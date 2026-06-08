import { Injectable, Logger } from '@nestjs/common'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import { MockProvider } from './mock.provider'
import { PrismaService } from '../../../prisma/prisma.service'

/**
 * Gửi thông báo qua Telegram Bot API. Token đọc theo TỪNG nhà xe từ
 * TenantNotificationConfig.telegramBotToken (mỗi nhà xe một bot). Nhà xe chưa cấu hình
 * token thì tự quay về mock — bản demo chạy được mà không gửi gì thật.
 *
 * `payload.to` là chat_id của hành khách (do bot đăng ký tự gắn vào telegramChatId).
 */
@Injectable()
export class TelegramProvider implements IMessageProvider {
  readonly channel = 'TELEGRAM'
  private readonly logger = new Logger(TelegramProvider.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({
      where: { tenantId: payload.tenantId },
      select: { telegramBotToken: true },
    })
    const token = config?.telegramBotToken
    if (!token) return this.mock.send('TELEGRAM', payload)

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: payload.to, text: payload.body }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        description?: string
        result?: { message_id?: number }
      }
      return res.ok && json.ok === true
        ? { success: true, providerId: json.result?.message_id?.toString() }
        : { success: false, error: `Telegram error=${res.status} ${json.description ?? ''}`.trim() }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
