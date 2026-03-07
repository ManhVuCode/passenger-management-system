import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  tenantName: string; // Tên công ty  VD: Xe Khách Hà Sơn

  @IsEmail()
  email: string;      // Email Admin VD: admin@hason.com

  @IsString()
  fullName: string;   // Tên Admin VD: Nguyen Van A

  @IsString()
  @MinLength(6)
  password: string;   // Mật khẩu VD: 123456
}
