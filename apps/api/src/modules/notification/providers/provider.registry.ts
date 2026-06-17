import { Injectable } from '@nestjs/common'
import type { IMessageProvider } from './message-provider.interface'
import { SmsProvider } from './sms.provider'
import { TelegramProvider } from './telegram.provider'
import { EmailProvider } from './email.provider'

/**
 * Phân giải chuỗi channel thành provider tương ứng. IN_APP/BROADCAST KHÔNG nằm ở đây —
 * đó là cảnh báo WebSocket trong ứng dụng do NotificationService (gateway) xử lý trực
 * tiếp, không phải provider gửi ra theo từng người nhận.
 */
@Injectable()
export class ProviderRegistry {
  private readonly byChannel: Record<string, IMessageProvider>

  constructor(
    sms: SmsProvider,
    telegram: TelegramProvider,
    email: EmailProvider,
  ) {
    this.byChannel = {
      [sms.channel]: sms,
      [telegram.channel]: telegram,
      [email.channel]: email,
    }
  }

  get(channel: string): IMessageProvider | null {
    return this.byChannel[channel] ?? null
  }
}
