/** Nguyên nhân khiến một thông báo được gửi. */
export type NotificationTrigger =
  | 'MANUAL'
  | 'ROUND_STARTED'
  | 'ROUND_CANCELLED'
  | 'ROUND_COMPLETED'
  | 'BOARDING_REMINDER'

/** Trạng thái vòng đời gửi được lưu trên NotificationLog. */
export type NotificationStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'NO_ANSWER'

/** Phản hồi của hành khách ghi nhận qua nhấn phím 1 trên IVR voice (hoặc sau này là nút Zalo) —
 *  CHỈ LÀ Ý ĐỊNH. Lưu trên NotificationLog.rsvp; KHÔNG BAO GIỜ ghi vào một
 *  AttendanceRecord (vốn là JOIN | ABSENT | CANCELLED, do BusManager/Admin đặt). */
export type RsvpIntent = 'WILL_BOARD' | 'WONT_BOARD'

/** Payload mang theo trên một job gửi đã vào hàng đợi. `payload.to` là contact THẬT
 * (dòng NotificationLog chỉ lưu dạng đã che bớt). */
export interface SendJobData {
  logId: string
  channel: string
  payload: { to: string; body: string; tenantId: string; templateKey?: string }
}

/** Định dạng số điện thoại chấp nhận cho người nhận SMS/voice. */
export const PHONE_RE = /^\+?[0-9]{9,15}$/

/** Định dạng Zalo OA user-id — một id dạng số thường dài hơn số điện thoại (18-19 chữ số). */
export const ZALO_ID_RE = /^[0-9]{6,32}$/

/** Che bớt contact để lưu trữ/hiển thị — chỉ giữ lại 3 ký tự cuối. */
export function redactContact(contact: string): string {
  const trimmed = (contact ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= 3) return '***'
  return `***${trimmed.slice(-3)}`
}
