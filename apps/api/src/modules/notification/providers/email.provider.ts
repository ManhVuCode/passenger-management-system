import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import { MockProvider } from './mock.provider'

/**
 * Adapter email. Chọn backend qua EMAIL_PROVIDER (BREVO | MOCK), mặc định MOCK
 * để bản dev/demo không gửi gì thật. Brevo được chọn vì free tier 300 email/ngày,
 * không cần thẻ và không bắt buộc verify domain (chỉ verify sender address).
 *
 * `payload.to` là địa chỉ email người nhận; `payload.subject` là tiêu đề thư
 * (thiếu thì dùng tiêu đề mặc định).
 */
@Injectable()
export class EmailProvider implements IMessageProvider {
  readonly channel = 'EMAIL'
  private readonly logger = new Logger(EmailProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const provider = (this.config.get<string>('EMAIL_PROVIDER') ?? 'MOCK').toUpperCase()
    if (provider === 'BREVO') return this.sendBrevo(payload)
    return this.mock.send('EMAIL', payload)
  }

  private async sendBrevo(payload: MessagePayload): Promise<SendResult> {
    const apiKey = this.config.get<string>('BREVO_API_KEY')
    const from = this.config.get<string>('EMAIL_FROM')
    if (!apiKey || !from) {
      this.logger.warn('EMAIL_PROVIDER=BREVO nhưng thiếu BREVO_API_KEY/EMAIL_FROM — dùng mock')
      return this.mock.send('EMAIL', payload)
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify({
          sender: { email: from, name: this.config.get<string>('EMAIL_FROM_NAME') ?? 'MPMS' },
          to: [{ email: payload.to }],
          subject: payload.subject ?? 'Thông báo từ MPMS',
          // Nội dung đã render dạng text — bọc <pre> để giữ xuống dòng của báo cáo
          htmlContent: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(payload.body)}</pre>`,
          // Brevo nhận tệp đính kèm dạng { name, content(base64) } — chỉ thêm khi có.
          ...(payload.attachments?.length
            ? { attachment: payload.attachments.map((a) => ({ name: a.filename, content: a.contentBase64 })) }
            : {}),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        messageId?: string
        message?: string
      }
      return res.ok
        ? { success: true, providerId: json.messageId }
        : { success: false, error: `Brevo error=${res.status} ${json.message ?? ''}`.trim() }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
