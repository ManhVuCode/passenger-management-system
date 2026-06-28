import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { IsSimpleText } from '../../../common/validators/is-simple-text.validator'

export class CreatePassengerDto {
  @IsString()
  @IsNotEmpty()
  @IsSimpleText()
  name!: string

  // SĐT KHÔNG bắt buộc — chỉ cần Tên. Nếu có nhập thì phải đúng 10 chữ số; chuỗi rỗng
  // được chuẩn hoá về undefined để không chặn người để trống.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string

  @IsString()
  @IsOptional()
  idCard?: string

  // Email hành khách (không bắt buộc) — dùng cho kênh EMAIL trước giờ khởi hành.
  // Chuỗi rỗng được chuẩn hóa về undefined để @IsEmail không chặn người để trống.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string

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
