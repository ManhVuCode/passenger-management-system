/**
 * Các domain event được phát ra như tác động phụ SAU KHI thay đổi trạng thái round
 * đã được lưu bền vững. RoundService là nơi phát duy nhất; NotificationDispatcher là
 * nơi tiêu thụ duy nhất. Đặt trong common/ để hai module không phụ thuộc lẫn nhau.
 */
export const RoundEvents = {
  STARTED: 'round.started',
  CANCELLED: 'round.cancelled',
  COMPLETED: 'round.completed',
} as const

export interface RoundEventPayload {
  tenantId: string
  tripId: string
  roundId: string
}
