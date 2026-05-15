import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreatePassengerDto {
  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name!: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
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
