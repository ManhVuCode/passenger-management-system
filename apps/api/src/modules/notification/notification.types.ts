/** What caused a notification to be sent. */
export type NotificationTrigger =
  | 'MANUAL'
  | 'ROUND_STARTED'
  | 'ROUND_CANCELLED'
  | 'ROUND_COMPLETED'
  | 'BOARDING_REMINDER'

/** Delivery lifecycle status persisted on NotificationLog. */
export type NotificationStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'NO_ANSWER'

/** Passenger reply captured by a voice IVR press-1 (or, later, a Zalo button) —
 *  INTENT ONLY. Stored on NotificationLog.rsvp; NEVER written to an
 *  AttendanceRecord (which is JOIN | ABSENT | CANCELLED, set by BusManager/Admin). */
export type RsvpIntent = 'WILL_BOARD' | 'WONT_BOARD'

/** Payload carried on a queued send job. `payload.to` is the REAL contact
 * (the NotificationLog row stores only a redacted form). */
export interface SendJobData {
  logId: string
  channel: string
  payload: { to: string; body: string; tenantId: string; templateKey?: string }
}

/** Phone shape accepted for SMS/voice recipients. */
export const PHONE_RE = /^\+?[0-9]{9,15}$/

/** Zalo OA user-id shape — a numeric id routinely longer than a phone (18-19 digits). */
export const ZALO_ID_RE = /^[0-9]{6,32}$/

/** Mask a contact for storage/display — keep only the last 3 chars. */
export function redactContact(contact: string): string {
  const trimmed = (contact ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= 3) return '***'
  return `***${trimmed.slice(-3)}`
}
