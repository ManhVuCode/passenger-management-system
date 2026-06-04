import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator'

export class ChatQueryDto {
  // Giới hạn độ dài đồng thời cũng là hàng rào kích thước chống lạm dụng / prompt-injection.
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string

  @IsOptional()
  @IsIn(['en', 'vi'])
  lang?: 'en' | 'vi'
}
