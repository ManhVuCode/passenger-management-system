import { IsString, IsNotEmpty, IsInt, Min, IsUrl } from 'class-validator'

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  licensePlate!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsInt()
  @Min(1)
  capacity!: number

  @IsUrl()
  photoFront!: string

  @IsUrl()
  photoSide!: string

  @IsUrl()
  photoRear!: string
}
