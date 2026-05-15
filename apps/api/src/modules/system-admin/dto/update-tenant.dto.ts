import { IsOptional, IsString, IsIn } from 'class-validator'

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED'
}
