import { IsIn, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['ADMIN', 'BUS_MANAGER'])
  role?: 'ADMIN' | 'BUS_MANAGER'
}
