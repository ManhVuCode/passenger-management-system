import { Injectable, Logger } from '@nestjs/common'
import type { MessagePayload, SendResult } from './message-provider.interface'

/**
 * Backend gửi mặc định được dùng mỗi khi chưa cấu hình một provider thật
 * (không có API keys / NODE_ENV=test). Ghi log tin nhắn và trả về thành công, để
 * toàn bộ pipeline (queue, logging, history UI) có thể demo đầy đủ mà không cần
 * tài khoản trả phí nào. Các provider khác ủy quyền về đây khi ở chế độ mock.
 */
@Injectable()
export class MockProvider {
  private readonly logger = new Logger(MockProvider.name)

  async send(channel: string, payload: MessagePayload): Promise<SendResult> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const preview = payload.body.length > 60 ? `${payload.body.slice(0, 60)}…` : payload.body
    this.logger.log(`[MOCK ${channel}] to=${payload.to} "${preview}" tenant=${payload.tenantId}`)
    return { success: true, providerId: `mock-${channel.toLowerCase()}` }
  }
}
