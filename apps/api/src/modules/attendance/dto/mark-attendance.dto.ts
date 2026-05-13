import { IsEnum, IsString, IsOptional, IsArray, ArrayMinSize, IsUUID } from 'class-validator'
import { AttendanceStatus } from '@pms/shared'

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  roundPassengerAssignmentIds!: string[]

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus

  @IsString()
  @IsOptional()
  note?: string
}
