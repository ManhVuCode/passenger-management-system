import { IsString, IsNotEmpty, IsInt, IsDateString, Min } from 'class-validator'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreateRoundDto {
  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name!: string

  @IsInt()
  @Min(1)
  sequence!: number

  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  departurePoint!: string

  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  arrivalPoint!: string

  @IsDateString()
  scheduledDep!: string

  @IsDateString()
  scheduledArr!: string
}
