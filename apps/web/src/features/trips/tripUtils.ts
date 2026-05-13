import { TripStatus } from '@pms/shared'

export type TripHighlight = 'approaching' | 'active' | 'normal' | 'done' | 'cancelled'

export function getTripHighlight(
  startDate: string | Date,
  endDate: string | Date,
  status: TripStatus,
): TripHighlight {
  if (status === TripStatus.DONE) return 'done'
  if (status === TripStatus.CANCELLED) return 'cancelled'

  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (now >= start && now <= end) return 'active'

  const diffMs = start.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays >= 0 && diffDays <= 3) return 'approaching'

  return 'normal'
}

export const TRIP_HIGHLIGHT_CLASSES: Record<TripHighlight, string> = {
  active: 'border-l-4 border-green-500 bg-green-50',
  approaching: 'border-l-4 border-amber-400 bg-amber-50',
  done: 'opacity-60 bg-gray-50',
  cancelled: 'opacity-40 bg-red-50',
  normal: 'bg-white',
}
