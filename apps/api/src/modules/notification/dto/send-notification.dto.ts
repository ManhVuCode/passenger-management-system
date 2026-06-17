import { IsEnum, IsString, IsOptional, IsArray, IsUUID, IsNotEmpty } from 'class-validator'

export enum NotificationChannel {
  SMS = 'SMS',
  TEAMS = 'TEAMS',
  BROADCAST = 'BROADCAST', // bí danh cũ của IN_APP (NotificationPanel hiện có)
  IN_APP = 'IN_APP', // cảnh báo WebSocket trong ứng dụng gửi tới tài xế
  TELEGRAM = 'TELEGRAM',
  VOICE = 'VOICE',
  EMAIL = 'EMAIL', // gửi email cho hành khách (chỉ những người có địa chỉ email)
}

export class SendNotificationDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel

  @IsString()
  @IsNotEmpty()
  message!: string

  @IsArray()
  @IsOptional()
  @IsUUID('all', { each: true })
  passengerIds?: string[]
}
