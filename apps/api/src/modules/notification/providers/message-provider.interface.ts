import type { NotificationStatus, RsvpIntent } from '../notification.types'

/** Kết quả của một lần thử gửi bởi provider của một kênh. */
export interface SendResult {
  success: boolean
  providerId?: string
  error?: string
  costMicro?: number
  /** Ghi đè trạng thái kết thúc tùy chọn (ví dụ NO_ANSWER của một cuộc gọi voice). Ưu tiên hơn
   *  ánh xạ mặc định success→SENT / failure→FAILED trong NotificationSender. */
  status?: NotificationStatus
  /** Ý định IVR ghi nhận tùy chọn (nhấn phím 1 voice). Chỉ ghi trên NotificationLog.rsvp
   *  — KHÔNG BAO GIỜ ghi vào một AttendanceRecord. */
  rsvp?: RsvpIntent
}

/** Một tin nhắn đã render gửi tới một người nhận trên một kênh. */
export interface MessagePayload {
  to: string // số điện thoại hoặc zaloId (hoặc nhãn webhook cho các kênh staff)
  body: string // nội dung tin nhắn đã render
  tenantId: string
  templateKey?: string
}

/** Interface theo mẫu Strategy: một adapter cho mỗi kênh gửi. */
export interface IMessageProvider {
  readonly channel: string // 'SMS' | 'ZALO' | 'VOICE' | 'TEAMS' (kênh gửi)
  send(payload: MessagePayload): Promise<SendResult>
}
