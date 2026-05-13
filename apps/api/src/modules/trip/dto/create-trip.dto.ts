import { IsString, IsNotEmpty, IsDateString, IsOptional, Matches } from 'class-validator'

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/]*$/, { message: 'Trip name must not contain "/"' })
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string
}
