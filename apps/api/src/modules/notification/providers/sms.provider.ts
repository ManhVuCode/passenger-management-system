import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import { MockProvider } from './mock.provider'

/**
 * SMS adapter. Picks the backend from SMS_PROVIDER (ESMS | TWILIO | MOCK).
 * Defaults to MOCK so dev/thesis demos send nothing real. The real branches
 * are wired but inert until credentials are set per the env.
 */
@Injectable()
export class SmsProvider implements IMessageProvider {
  readonly channel = 'SMS'
  private readonly logger = new Logger(SmsProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const provider = (this.config.get<string>('SMS_PROVIDER') ?? 'MOCK').toUpperCase()
    if (provider === 'ESMS') return this.sendEsms(payload)
    if (provider === 'TWILIO') return this.sendTwilio(payload)
    return this.mock.send('SMS', payload)
  }

  private async sendEsms(payload: MessagePayload): Promise<SendResult> {
    const apiKey = this.config.get<string>('SMS_API_KEY')
    const secretKey = this.config.get<string>('SMS_SECRET_KEY')
    const brandname = this.config.get<string>('SMS_BRANDNAME')
    if (!apiKey || !secretKey) {
      this.logger.warn('SMS_PROVIDER=ESMS but credentials missing — using mock')
      return this.mock.send('SMS', payload)
    }
    try {
      const res = await fetch(
        'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ApiKey: apiKey,
            SecretKey: secretKey,
            Brandname: brandname,
            SmsType: 2,
            Content: payload.body,
            Phone: payload.to,
          }),
        },
      )
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const ok = res.ok && String(json.CodeResult) === '100'
      return ok
        ? { success: true, providerId: json.SMSID != null ? String(json.SMSID) : undefined }
        : { success: false, error: `eSMS CodeResult=${String(json.CodeResult ?? res.status)}` }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  private async sendTwilio(payload: MessagePayload): Promise<SendResult> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')
    const from = this.config.get<string>('SMS_FROM')
    if (!sid || !token || !from) {
      this.logger.warn('SMS_PROVIDER=TWILIO but credentials missing — using mock')
      return this.mock.send('SMS', payload)
    }
    try {
      const form = new URLSearchParams({ To: payload.to, From: from, Body: payload.body })
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      })
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return res.ok
        ? { success: true, providerId: json.sid != null ? String(json.sid) : undefined }
        : { success: false, error: json.message != null ? String(json.message) : `HTTP ${res.status}` }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
