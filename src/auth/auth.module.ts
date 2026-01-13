import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 👇 1. QUAN TRỌNG: Phải import thư viện này để dùng được AuthGuard
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy'; // <-- Ông bảo vệ soát vé

// Import các bảng database
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Role } from '../entities/role.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

@Module({
  imports: [
    // Khai báo các bảng dùng trong Auth
    TypeOrmModule.forFeature([User, Tenant, Role, UserTenantRole]),

    // 👇 2. CẤU HÌNH PASSPORT (SỬA LỖI Ở ĐÂY)
    // Phải đăng ký module này thì mới dùng được các chức năng bảo vệ
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Cấu hình JWT (Máy in vé)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  
  // Khai báo Service và Strategy (Ông bảo vệ)
  providers: [AuthService, JwtStrategy],

  // 👇 3. XUẤT KHẨU (Để module khác như TripsModule dùng ké được ông bảo vệ)
  // Vì bên trên đã import PassportModule rồi, nên ở đây mới export được (hết lỗi đỏ)
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}