import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator'

export class ChatQueryDto {
  // Length cap doubles as an abuse / prompt-injection size guard.
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string

  @IsOptional()
  @IsIn(['en', 'vi'])
  lang?: 'en' | 'vi'
}
