import type { NotificationStatus } from '../notification.types'

/** Kết quả của một lần thử gửi bởi provider của một kênh. */
export interface SendResult {
  success: boolean
  providerId?: string
  error?: string
  costMicro?: number
  /** Ghi đè trạng thái kết thúc tùy chọn. Ưu tiên hơn ánh xạ mặc định
   *  success→SENT / failure→FAILED trong NotificationSender. */
  status?: NotificationStatus
}

/** Tệp đính kèm cho kênh EMAIL (vd báo cáo .xlsx). `contentBase64` là nội dung tệp đã mã hóa base64. */
export interface EmailAttachment {
  filename: string
  contentBase64: string
}

/** Một tin nhắn đã render gửi tới một người nhận trên một kênh. */
export interface MessagePayload {
  to: string // số điện thoại, telegram chat id, địa chỉ email (hoặc nhãn webhook cho các kênh staff)
  body: string // nội dung tin nhắn đã render
  tenantId: string
  templateKey?: string
  subject?: string // chỉ kênh EMAIL dùng — tiêu đề thư
  attachments?: EmailAttachment[] // chỉ kênh EMAIL — danh sách tệp đính kèm
}

/** Interface theo mẫu Strategy: một adapter cho mỗi kênh gửi. */
export interface IMessageProvider {
  readonly channel: string // 'SMS' | 'TELEGRAM' | 'EMAIL' (kênh gửi)
  send(payload: MessagePayload): Promise<SendResult>
}
