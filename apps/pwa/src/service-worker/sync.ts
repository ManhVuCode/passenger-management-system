export const ATTENDANCE_SYNC_TAG = 'attendance-sync'
export const ATTENDANCE_QUEUE_KEY = 'pending-attendance'

export interface PendingAttendanceMark {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string
  timestamp: number
}
