/**
 * Shape and safe parsing of TenantNotificationConfig.autoRules (stored as Json).
 * Every rule defaults to false — automation is opt-in, so a missing or malformed
 * config never auto-sends to passengers.
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

/** Coerce an unknown Json value into a fully-populated AutoRules (all-false default). */
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
