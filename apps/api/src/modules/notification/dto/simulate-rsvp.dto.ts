import { IsIn, IsUUID } from 'class-validator'

/** C3 — body for "simulate IVR press-1": record a passenger's boarding intent on
 *  a voice NotificationLog row. Intent only — never writes an AttendanceRecord. */
export class SimulateRsvpDto {
  @IsUUID()
  logId!: string

  @IsIn(['WILL_BOARD', 'WONT_BOARD'])
  rsvp!: 'WILL_BOARD' | 'WONT_BOARD'
}
