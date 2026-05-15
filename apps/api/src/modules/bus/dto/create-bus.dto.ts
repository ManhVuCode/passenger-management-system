import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator'

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
