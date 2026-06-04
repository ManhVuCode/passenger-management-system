import { IsBoolean, IsOptional } from 'class-validator'

/** Partial update of a tenant's automation toggles — any omitted rule is left as-is. */
export class UpdateAutoRulesDto {
  @IsOptional()
  @IsBoolean()
  roundStarted?: boolean

  @IsOptional()
  @IsBoolean()
  roundCancelled?: boolean

  @IsOptional()
  @IsBoolean()
  roundCompleted?: boolean

  @IsOptional()
  @IsBoolean()
  boardingReminder?: boolean
}
