/**
 * Domain events emitted as side-effects AFTER a round status change is durably
 * committed. RoundService is the only emitter; NotificationDispatcher is the only
 * consumer. Kept in common/ so neither module depends on the other.
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
