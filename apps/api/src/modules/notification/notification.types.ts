/** Nguyên nhân khiến một thông báo được gửi. */
export type NotificationTrigger =
  | 'MANUAL'
  | 'ROUND_STARTED'
  | 'ROUND_CANCELLED'
  | 'ROUND_COMPLETED'
  | 'TRIP_COMPLETED'
  | 'BOARDING_REMINDER'

/** Trạng thái vòng đời gửi được lưu trên NotificationLog. */
export type NotificationStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'

/** Payload mang theo trên một job gửi đã vào hàng đợi. `payload.to` là contact THẬT
 * (dòng NotificationLog chỉ lưu dạng đã che bớt). */
export interface SendJobData {
  logId: string
  channel: string
  payload: {
    to: string
    body: string
    tenantId: string
    templateKey?: string
    subject?: string
    attachments?: { filename: string; contentBase64: string }[]
  }
}

/** Định dạng số điện thoại chấp nhận cho người nhận SMS. */
export const PHONE_RE = /^\+?[0-9]{9,15}$/

/** Định dạng email chấp nhận cho người nhận kênh EMAIL — kiểm tra thô, đủ chặn rác. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Định dạng Telegram chat target — chat_id dạng số (private/supergroup) hoặc @username. */
export const TELEGRAM_ID_RE = /^(-?[0-9]{1,20}|@[A-Za-z0-9_]{5,32})$/

/** Che bớt contact để lưu trữ/hiển thị — chỉ giữ lại 3 ký tự cuối. */
export function redactContact(contact: string): string {
  const trimmed = (contact ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= 3) return '***'
  return `***${trimmed.slice(-3)}`
}
