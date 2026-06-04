import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import { MockProvider } from './mock.provider'

/**
 * Adapter cho Zalo ZNS. Chọn backend từ ZALO_PROVIDER (ZNS | MOCK), mặc định
 * là MOCK để bản dev/demo đồ án không gửi gì thật. Nhánh ZNS thật đã được nối dây
 * nhưng chưa hoạt động cho tới khi cấu hình access token của Zalo OA + một ZNS template id
 * đã được duyệt — cùng kiểu với các nhánh eSMS/Twilio của SmsProvider.
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
   * Gửi qua Zalo Notification Service thật. ZNS chỉ gửi các template ĐÃ ĐƯỢC DUYỆT
   * (không cho text tự do) tới một số điện thoại đã liên kết Zalo, nên `template_data` phải
   * khớp với các tham số của template đã duyệt — ở đây body được ánh xạ sang tham số `content`
   * như một mặc định minh hoạ. Thông tin xác thực chỉ đọc từ env (không bao giờ
   * commit); nếu thiếu thông tin xác thực thì quay về dùng mock.
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
