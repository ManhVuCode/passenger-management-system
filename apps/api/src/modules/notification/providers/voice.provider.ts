import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import type { NotificationStatus, RsvpIntent } from '../notification.types'
import { MockProvider } from './mock.provider'

/**
 * Adapter Voice (cuộc gọi đi). Trong demo đồ án, đây là một BỘ MÔ PHỎNG cuộc gọi mang
 * tính tất định — nó "phát" kịch bản TTS tiếng Việt và trả về kết quả cuộc gọi như thật.
 * Một provider thật (Stringee / Twilio Voice + IVR) có thể gắn vào cùng điểm nối đó:
 * đặt VOICE_PROVIDER và hiện thực nhánh tương ứng — dispatcher, queue, sender và pipeline
 * NotificationLog giữ nguyên không đổi.
 */
@Injectable()
export class VoiceProvider implements IMessageProvider {
  readonly channel = 'VOICE'
  private readonly logger = new Logger(VoiceProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const backend = (this.config.get<string>('VOICE_PROVIDER') ?? 'MOCK').toUpperCase()
    if (backend !== 'MOCK') {
      // Đồ án chưa nối dây tổng đài thật — quay về bộ mô phỏng thay vì âm thầm
      // bỏ qua cuộc gọi.
      this.logger.warn(`VOICE_PROVIDER=${backend} not implemented; using call simulator`)
    }
    return this.simulateCall(payload)
  }

  /**
   * Bộ mô phỏng cuộc gọi đi mang tính tất định: cùng một số điện thoại luôn cho ra cùng
   * kết quả (test + demo tái lập được). Các kết quả:
   *  - ~8%  BUSY  → lỗi tạm thời (queue retry, sau đó chốt FAILED)
   *  - ~22% NO_ANSWER → kết quả cuộc gọi cuối cùng (không retry)
   *  - ~70% ANSWERED (DELIVERED), đã phát TTS; một phần tự đăng ký press-1 RSVP
   *         INTENT — chỉ ghi vào NotificationLog.rsvp, không bao giờ tính là điểm danh.
   */
  private async simulateCall(payload: MessagePayload): Promise<SendResult> {
    // Tái sử dụng mock cho dòng log "[MOCK VOICE] speaking …" + độ trễ quay số.
    await this.mock.send('VOICE', payload)
    const seed = seedFromContact(payload.to)
    const providerId = `mock-voice-${seed}`

    if (seed < 8) {
      return { success: false, error: 'BUSY', providerId }
    }
    if (seed < 30) {
      const status: NotificationStatus = 'NO_ANSWER'
      return { success: true, status, providerId, costMicro: 150 }
    }
    const status: NotificationStatus = 'DELIVERED'
    const rsvp = autoRsvp(seed)
    return { success: true, status, providerId, costMicro: 800, ...(rsvp ? { rsvp } : {}) }
  }
}

/** Bucket 0–99 ổn định từ chuỗi liên hệ (không dùng RNG → tái lập được). */
function seedFromContact(contact: string): number {
  let h = 0
  for (const ch of contact) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 100
}

/** Mô phỏng tự động phím IVR: một số ít cuộc gọi được nghe máy sẽ xác nhận ý định. */
function autoRsvp(seed: number): RsvpIntent | null {
  if (seed % 5 === 0) return 'WILL_BOARD'
  if (seed % 5 === 1) return 'WONT_BOARD'
  return null
}
