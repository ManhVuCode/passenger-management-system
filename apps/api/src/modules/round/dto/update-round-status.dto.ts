import { IsEnum } from 'class-validator'
import { RoundStatus } from '@pms/shared'

export class UpdateRoundStatusDto {
  @IsEnum(RoundStatus)
  status!: RoundStatus
}
