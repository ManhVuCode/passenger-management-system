import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common'; // import Get, UseGuards, Req de test token
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto'; // <-- Import mới

import { AuthGuard } from '@nestjs/passport'; // <--- Import AuthGuard de test token

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


  // --- THÊM API NÀY ĐỂ TEST TOKEN ---
  @UseGuards(AuthGuard('jwt')) // <--- "Cổng an ninh": Có vé mới được vào
  @Get('profile')
  getProfile(@Req() req) {
    // Nếu vào được đây nghĩa là Token xịn
    return req.user; // Trả về thông tin người dùng lấy từ Token
  }
}