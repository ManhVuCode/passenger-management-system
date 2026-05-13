import { IsEnum, IsString, IsOptional, IsArray, IsUUID, IsNotEmpty } from 'class-validator'

export enum NotificationChannel {
  SMS = 'SMS',
  TEAMS = 'TEAMS',
  BROADCAST = 'BROADCAST',
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
