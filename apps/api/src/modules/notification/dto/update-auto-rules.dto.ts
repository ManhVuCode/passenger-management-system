import { IsBoolean, IsOptional } from 'class-validator'

/** Cập nhật một phần các công tắc tự động hóa của tenant — quy tắc nào không truyền sẽ được giữ nguyên. */
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
