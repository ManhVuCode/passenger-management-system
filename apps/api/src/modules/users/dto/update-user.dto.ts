import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @Matches(/^(\d{10})?$/, { message: 'Phone must be exactly 10 digits' })
  phone?: string

  @IsOptional()
  @IsIn(['ADMIN', 'BUS_MANAGER'])
  role?: 'ADMIN' | 'BUS_MANAGER'
}
