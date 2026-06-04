import { Injectable } from '@nestjs/common'
import type { IMessageProvider } from './message-provider.interface'
import { SmsProvider } from './sms.provider'
import { TeamsProvider } from './teams.provider'
import { VoiceProvider } from './voice.provider'
import { ZaloProvider } from './zalo.provider'

/**
 * Phân giải chuỗi channel thành provider tương ứng. IN_APP/BROADCAST KHÔNG nằm ở đây —
 * đó là cảnh báo WebSocket trong ứng dụng do NotificationService (gateway) xử lý trực
 * tiếp, không phải provider gửi ra theo từng người nhận.
 */
@Injectable()
export class ProviderRegistry {
  private readonly byChannel: Record<string, IMessageProvider>

  constructor(sms: SmsProvider, teams: TeamsProvider, voice: VoiceProvider, zalo: ZaloProvider) {
    this.byChannel = {
      [sms.channel]: sms,
      [teams.channel]: teams,
      [voice.channel]: voice,
      [zalo.channel]: zalo,
    }
  }

  get(channel: string): IMessageProvider | null {
    return this.byChannel[channel] ?? null
  }
}
