// Đăng nhập hợp nhất (web ↔ PWA): một trang login dùng chung cho mọi vai trò.
// Nếu vai trò thuộc app còn lại, phiên đăng nhập được chuyển qua URL hash (#sso=1&...).
// Token nằm trong fragment nên không bao giờ được gửi lên server / dính vào access log.
// File này được nhân bản y hệt ở apps/pwa/src/features/auth/sso.ts (packages/shared chỉ chứa type).

export interface SsoCredentials {
  accessToken: string
  userId: string
  tenantId: string
  role: string
  name: string
  email: string
}

const FIELDS = ['accessToken', 'userId', 'tenantId', 'role', 'name', 'email'] as const

/** Đóng gói thông tin đăng nhập thành hash để chuyển sang app còn lại. */
export function buildSsoHash(data: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const f of FIELDS) params.set(f, String(data[f] ?? ''))
  return `#sso=1&${params.toString()}`
}

/**
 * Đọc và XÓA NGAY hash #sso=1 trên URL hiện tại (nếu có).
 * Trả về credentials để dispatch setCredentials, hoặc null nếu không có handoff.
 */
export function consumeSsoHash(): SsoCredentials | null {
  const hash = window.location.hash
  if (!hash.startsWith('#sso=1')) return null
  const params = new URLSearchParams(hash.slice(1))
  const creds: Record<string, string> = {}
  for (const f of FIELDS) creds[f] = params.get(f) ?? ''
  // Xóa hash ngay để token không nằm lại trên thanh địa chỉ / lịch sử trình duyệt
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  if (!creds.accessToken) return null
  return creds as unknown as SsoCredentials
}
