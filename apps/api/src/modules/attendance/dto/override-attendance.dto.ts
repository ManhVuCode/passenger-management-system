import { IsEnum, IsString, IsOptional } from 'class-validator'
import { AttendanceStatus } from '@pms/shared'

export class OverrideAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus

  @IsString()
  @IsOptional()
  note?: string
}
