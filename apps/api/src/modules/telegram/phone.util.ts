/**
 * Chuẩn hoá số điện thoại người dùng gõ vào bot về dạng 10 chữ số như đã lưu trong DB
 * (cùng chuẩn với CreatePassengerDto: /^\d{10}$/). Chấp nhận khoảng trắng, dấu chấm,
 * và tiền tố +84 / 84. Trả về null nếu không hợp lệ.
 */
export function normalizePhone(raw: string): string | null {
  let s = (raw ?? '').replace(/[^\d]/g, '')
  if (s.length === 11 && s.startsWith('84')) s = '0' + s.slice(2)
  return /^\d{10}$/.test(s) ? s : null
}
