/**
 * Định nghĩa cấu trúc và phân tích an toàn TenantNotificationConfig.autoRules (lưu dưới dạng Json).
 * Mọi quy tắc mặc định là false — tự động hóa phải được bật thủ công, nên một
 * config bị thiếu hoặc sai định dạng sẽ không bao giờ tự động gửi cho hành khách.
 */
export interface AutoRules {
  roundStarted: boolean
  roundCancelled: boolean
  roundCompleted: boolean
  boardingReminder: boolean
}

export type AutoRuleKey = keyof AutoRules

export const DEFAULT_AUTO_RULES: AutoRules = {
  roundStarted: false,
  roundCancelled: false,
  roundCompleted: false,
  boardingReminder: false,
}

/** Ép một giá trị Json không xác định thành AutoRules đầy đủ (mặc định tất cả là false). */
export function resolveAutoRules(raw: unknown): AutoRules {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AUTO_RULES }
  const obj = raw as Record<string, unknown>
  return {
    roundStarted: obj.roundStarted === true,
    roundCancelled: obj.roundCancelled === true,
    roundCompleted: obj.roundCompleted === true,
    boardingReminder: obj.boardingReminder === true,
  }
}
