import type { NotificationStatus, RsvpIntent } from '../notification.types'

/** Result of a single send attempt by a channel provider. */
export interface SendResult {
  success: boolean
  providerId?: string
  error?: string
  costMicro?: number
  /** Optional terminal status override (e.g. a voice call's NO_ANSWER). Wins over
   *  the default success→SENT / failure→FAILED mapping in NotificationSender. */
  status?: NotificationStatus
  /** Optional captured IVR intent (voice press-1). Recorded on NotificationLog.rsvp
   *  only — NEVER written to an AttendanceRecord. */
  rsvp?: RsvpIntent
}

/** A rendered message destined for one recipient on one channel. */
export interface MessagePayload {
  to: string // phone number or zaloId (or webhook label for staff channels)
  body: string // rendered message text
  tenantId: string
  templateKey?: string
}

/** Strategy interface: one adapter per delivery channel. */
export interface IMessageProvider {
  readonly channel: string // 'SMS' | 'ZALO' | 'VOICE' | 'TEAMS'
  send(payload: MessagePayload): Promise<SendResult>
}
