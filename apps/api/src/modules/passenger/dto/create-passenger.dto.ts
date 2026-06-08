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

  // D — telegramChatId KHÔNG nhập tay: do bot đăng ký tự gắn khi hành khách bấm /start +
  // nhập số điện thoại. Admin chỉ xem (read-only), không gửi qua DTO này.

  // D — đồng ý: khi true, tất cả các kênh bỏ qua hành khách này (SMS STOP / Telegram opt-out).
  @IsBoolean()
  @IsOptional()
  contactOptOut?: boolean
}
