import { IsEnum, IsString, IsOptional, IsArray, IsUUID, IsNotEmpty } from 'class-validator'

export enum NotificationChannel {
  SMS = 'SMS',
  TEAMS = 'TEAMS',
  BROADCAST = 'BROADCAST', // legacy alias of IN_APP (existing NotificationPanel)
  IN_APP = 'IN_APP', // in-app WebSocket alert to drivers
  ZALO = 'ZALO',
  VOICE = 'VOICE',
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
