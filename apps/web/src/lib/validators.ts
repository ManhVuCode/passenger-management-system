/** Chỉ cho phép chữ cái (bao gồm tiếng Việt), chữ số, khoảng trắng và dấu gạch nối. */
export const SIMPLE_TEXT_REGEX = /^[a-zA-ZÀ-ỹ0-9\s\-]+$/
export const SIMPLE_TEXT_MSG = 'Only letters, numbers, spaces, and hyphens (-) are allowed'

/** Đúng 10 chữ số. */
export const PHONE_REGEX = /^\d{10}$/
export const PHONE_MSG = 'Phone number must be exactly 10 digits'

/** Biển số xe: chữ cái, chữ số, dấu gạch nối, dấu chấm (không phân biệt hoa thường). */
export const LICENSE_PLATE_REGEX = /^[A-Z0-9\-\.]+$/i
export const LICENSE_PLATE_MSG = 'Only letters, numbers, hyphens and dots'

export function validateSimpleText(value: string): string {
  if (!value.trim()) return 'This field is required'
  if (!SIMPLE_TEXT_REGEX.test(value)) return SIMPLE_TEXT_MSG
  return ''
}

export function validatePhone(value: string): string {
  if (!value.trim()) return 'Phone number is required'
  if (!PHONE_REGEX.test(value)) return PHONE_MSG
  return ''
}

/** SĐT tuỳ chọn: để trống được; nếu có nhập thì phải đúng 10 chữ số. */
export function validateOptionalPhone(value: string): string {
  if (!value.trim()) return ''
  if (!PHONE_REGEX.test(value)) return PHONE_MSG
  return ''
}

export function validateLicensePlate(value: string): string {
  if (!value.trim()) return 'License plate is required'
  if (!LICENSE_PLATE_REGEX.test(value)) return LICENSE_PLATE_MSG
  return ''
}
