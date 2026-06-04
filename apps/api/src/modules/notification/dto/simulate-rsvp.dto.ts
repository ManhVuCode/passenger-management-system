import { IsIn, IsUUID } from 'class-validator'

/** C3 — body cho "simulate IVR press-1": ghi nhận ý định lên xe của một hành khách vào
 *  một dòng NotificationLog dạng voice. Chỉ là ý định — không bao giờ ghi AttendanceRecord. */
export class SimulateRsvpDto {
  @IsUUID()
  logId!: string

  @IsIn(['WILL_BOARD', 'WONT_BOARD'])
  rsvp!: 'WILL_BOARD' | 'WONT_BOARD'
}
