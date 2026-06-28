import { IsString, IsNotEmpty, IsInt, IsDateString, Min, IsOptional } from 'class-validator'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreateRoundDto {
  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name!: string

  @IsInt()
  @Min(1)
  sequence!: number

  // Chỉ Tên + Thứ tự bắt buộc — các trường còn lại tuỳ chọn.
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
}
