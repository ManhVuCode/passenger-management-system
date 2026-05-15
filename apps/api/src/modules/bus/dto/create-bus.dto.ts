import { IsString, IsNotEmpty, IsInt, Min, Matches } from 'class-validator'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9\-\.]+$/i, {
    message: 'License plate: only letters, numbers, hyphens and dots',
  })
  licensePlate!: string

  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name!: string

  @IsInt()
  @Min(1)
  capacity!: number

  @IsString()
  @IsNotEmpty()
  photoFront!: string

  @IsString()
  @IsNotEmpty()
  photoSide!: string

  @IsString()
  @IsNotEmpty()
  photoRear!: string
}
