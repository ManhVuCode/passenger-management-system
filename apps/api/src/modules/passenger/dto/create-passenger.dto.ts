import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreatePassengerDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  phone!: string

  @IsString()
  @IsOptional()
  idCard?: string

  @IsString()
  @IsOptional()
  type?: string

  @IsString()
  @IsOptional()
  note?: string
}
