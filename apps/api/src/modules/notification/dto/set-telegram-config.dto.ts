import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

/** D1 — đặt bot token Telegram cho tenant (lấy từ @BotFather). @username tự suy ra qua getMe. */
export class SetTelegramConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  botToken!: string
}
