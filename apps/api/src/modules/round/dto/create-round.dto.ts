import { IsString, IsNotEmpty, IsInt, IsDateString, Min } from 'class-validator'

export class CreateRoundDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsInt()
  @Min(1)
  sequence!: number

  @IsString()
  @IsNotEmpty()
  departurePoint!: string

  @IsString()
  @IsNotEmpty()
  arrivalPoint!: string

  @IsDateString()
  scheduledDep!: string

  @IsDateString()
  scheduledArr!: string
}
