import { IsString, IsNotEmpty, IsDateString, IsOptional, Matches } from 'class-validator'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/]*$/, { message: 'Trip name must not contain "/"' })
  @IsSimpleText({ message: 'Trip name: only letters, numbers, spaces, and hyphens allowed' })
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string
}
