import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantUserRole } from '../../entities/user-tenant-role.entity';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(TenantUserRole)
  role: TenantUserRole;
}
