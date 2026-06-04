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

  // D — Zalo OA user id (dạng số, 6–32 chữ số) dùng để định tuyến ZNS; tuỳ chọn, sẽ
  // quay về dùng phone khi vắng mặt.
  @IsString()
  @IsOptional()
  @Matches(/^\d{6,32}$/, { message: 'Zalo ID must be 6–32 digits' })
  zaloId?: string

  // D — đồng ý: khi true, tất cả các kênh bỏ qua hành khách này (SMS STOP / Zalo opt-out).
  @IsBoolean()
  @IsOptional()
  contactOptOut?: boolean
}
