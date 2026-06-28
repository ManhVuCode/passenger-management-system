import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Mã hoá 2 chiều mật khẩu để SystemAdmin xem lại (yêu cầu nghiệp vụ, không phải best-practice).
// Khoá lấy từ PASSWORD_ENC_KEY (env). Chưa cấu hình → trả null, cột mật khẩu để trống.
const RAW_KEY = process.env.PASSWORD_ENC_KEY
const KEY = RAW_KEY ? scryptSync(RAW_KEY, 'mpms-password-enc', 32) : null

export function encryptPassword(plain: string): string | null {
  if (!KEY) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptPassword(blob: string | null | undefined): string | null {
  if (!KEY || !blob) return null
  try {
    const [ivB, tagB, dataB] = blob.split(':')
    if (!ivB || !tagB || !dataB) return null
    const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
