import { IsArray, ArrayNotEmpty, IsString } from 'class-validator'

/** Đưa điểm danh về trạng thái chờ (pending) bằng cách xoá bản ghi điểm danh. */
export class ResetAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roundPassengerAssignmentIds!: string[]
}
