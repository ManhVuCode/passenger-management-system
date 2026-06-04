import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator'
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

  @IsString()
  @IsOptional()
  hotelRoom?: string

  // D — Zalo OA user id (numeric, 6–32 digits) for ZNS routing; optional, falls
  // back to phone when absent.
  @IsString()
  @IsOptional()
  @Matches(/^\d{6,32}$/, { message: 'Zalo ID must be 6–32 digits' })
  zaloId?: string

  // D — consent: when true, all channels skip this passenger (SMS STOP / Zalo opt-out).
  @IsBoolean()
  @IsOptional()
  contactOptOut?: boolean
}
