import { Injectable } from '@nestjs/common'
import type { IMessageProvider } from './message-provider.interface'
import { SmsProvider } from './sms.provider'
import { TeamsProvider } from './teams.provider'
import { VoiceProvider } from './voice.provider'
import { ZaloProvider } from './zalo.provider'

/**
 * Resolves a channel string to its provider. IN_APP/BROADCAST are NOT here —
 * those are an in-app WebSocket alert handled directly by NotificationService
 * (the gateway), not a per-recipient outbound provider.
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
