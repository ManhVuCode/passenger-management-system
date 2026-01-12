import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto'; // <-- Import mới

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-tenant')
  register(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login') // <-- API mới: POST /auth/login
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}