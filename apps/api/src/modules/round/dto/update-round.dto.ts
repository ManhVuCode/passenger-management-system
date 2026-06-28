import { IsString, IsNotEmpty, IsInt, IsDateString, Min, IsOptional, IsEnum } from 'class-validator'
import { RoundStatus } from '@pms/shared'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

/** Sửa thông tin chặng. Mọi trường tuỳ chọn; trạng thái Admin được đổi tự do
 *  (kể cả khôi phục chặng đã huỷ về Kế hoạch). */
export class UpdateRoundDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number

  @IsOptional()
  @IsString()
  @IsSimpleText()
  departurePoint?: string

  @IsOptional()
  @IsString()
  @IsSimpleText()
  arrivalPoint?: string

  @IsOptional()
  @IsDateString()
  scheduledDep?: string

  @IsOptional()
  @IsDateString()
  scheduledArr?: string

  @IsOptional()
  @IsEnum(RoundStatus)
  status?: RoundStatus
}
