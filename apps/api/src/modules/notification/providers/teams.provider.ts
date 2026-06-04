import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'

/**
 * Adapter Teams (kênh nội bộ nhân viên/vận hành). Gửi một MessageCard tới TEAMS_WEBHOOK_URL.
 * Quay về ghi log dev khi webhook chưa được cấu hình. Logic được chuyển nguyên văn từ
 * NotificationService.sendTeams() trước đây.
 *
 * Lưu ý: đây là kênh dành cho NHÂN VIÊN, không bao giờ là kênh tiếp cận hành khách. Webhook
 * MessageCard là connector cũ của Microsoft (đang bị khai tử, thay bằng Workflows /
 * Adaptive Cards) — đủ dùng cho demo đồ án, cần lưu ý khi lên production.
 */
@Injectable()
export class TeamsProvider implements IMessageProvider {
  readonly channel = 'TEAMS'
  private readonly logger = new Logger(TeamsProvider.name)

  constructor(private readonly config: ConfigService) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const webhookUrl = this.config.get<string>('TEAMS_WEBHOOK_URL')
    if (!webhookUrl) {
      this.logger.log(`[DEV TEAMS] ${payload.body}`)
      return { success: true, providerId: 'dev-teams' }
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          summary: payload.body,
          sections: [{ activityTitle: payload.body }],
        }),
      })
      return res.ok
        ? { success: true, providerId: 'teams' }
        : { success: false, error: `HTTP ${res.status}` }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
