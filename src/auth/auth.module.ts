import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Import các bảng
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Role } from '../entities/role.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

// <-- Thêm jwt
import { JwtModule } from '@nestjs/jwt'; 
import { ConfigModule, ConfigService } from '@nestjs/config'; 

@Module({
  imports: [
    // Báo cho AuthModule biết nó được phép dùng 4 bảng này
    TypeOrmModule.forFeature([User, Tenant, Role, UserTenantRole]), 

    // Cấu hình JWT (Máy in vé)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Lấy key bí mật từ .env
        signOptions: { expiresIn: '1d' }, // Vé có hạn 1 ngày
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}