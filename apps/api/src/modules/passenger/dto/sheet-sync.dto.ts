import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator'

export enum SheetSyncMode {
  GENERATE = 'GENERATE',
  IMPORT = 'IMPORT',
}

export class SheetSyncDto {
  @IsEnum(SheetSyncMode)
  mode!: SheetSyncMode

  @IsString()
  @IsOptional()
  sheetUrl?: string

  @IsObject()
  @IsOptional()
  columnMapping?: Record<string, string>
}
