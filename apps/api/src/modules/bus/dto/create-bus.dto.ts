import { IsString, IsNotEmpty, IsInt, Min, Matches, IsOptional } from 'class-validator'
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
  @IsOptional()
  photoFront?: string

  @IsString()
  @IsOptional()
  photoSide?: string

  @IsString()
  @IsOptional()
  photoRear?: string
}
