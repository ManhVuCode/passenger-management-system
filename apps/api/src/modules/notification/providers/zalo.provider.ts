import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import { MockProvider } from './mock.provider'

/**
 * Zalo ZNS adapter. Picks the backend from ZALO_PROVIDER (ZNS | MOCK), defaulting
 * to MOCK so dev/thesis demos send nothing real. The real ZNS branch is wired but
 * inert until a Zalo OA access token + an approved ZNS template id are configured
 * — same shape as SmsProvider's eSMS/Twilio branches.
 */
@Injectable()
export class ZaloProvider implements IMessageProvider {
  readonly channel = 'ZALO'
  private readonly logger = new Logger(ZaloProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const provider = (this.config.get<string>('ZALO_PROVIDER') ?? 'MOCK').toUpperCase()
    if (provider === 'ZNS') return this.sendZns(payload)
    return this.mock.send('ZALO', payload)
  }

  /**
   * Real Zalo Notification Service send. ZNS only delivers PRE-APPROVED templates
   * (no freeform text) to a phone number linked to Zalo, so `template_data` must
   * match the approved template's params — here the body is mapped to a `content`
   * param as an illustrative default. Credentials are read from env only (never
   * committed); missing creds fall back to mock.
   */
  private async sendZns(payload: MessagePayload): Promise<SendResult> {
    const accessToken = this.config.get<string>('ZALO_OA_ACCESS_TOKEN')
    const templateId = this.config.get<string>('ZALO_ZNS_TEMPLATE_ID')
    if (!accessToken || !templateId) {
      this.logger.warn('ZALO_PROVIDER=ZNS but OA token / template id missing — using mock')
      return this.mock.send('ZALO', payload)
    }
    try {
      const res = await fetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: accessToken },
        body: JSON.stringify({
          phone: payload.to,
          template_id: templateId,
          template_data: { content: payload.body },
          tracking_id: payload.tenantId,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: number
        message?: string
        data?: { msg_id?: string }
      }
      const ok = res.ok && Number(json.error) === 0
      return ok
        ? { success: true, providerId: json.data?.msg_id }
        : { success: false, error: `ZNS error=${json.error ?? res.status} ${json.message ?? ''}`.trim() }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
