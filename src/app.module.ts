import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { RoundsModule } from './rounds/rounds.module';

@Module({
  imports: [
    // 1. Đọc file .env
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Kết nối Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        
        // Tự động tìm và tạo bảng từ code Entity
        autoLoadEntities: true,
        synchronize: true, // Dev mode: Tự động sửa bảng khi sửa code
        ssl: false,        // Quan trọng: Tắt SSL để không bị lỗi kết nối
      }),
      inject: [ConfigService],
    }),

    AuthModule,

    TripsModule,

    RoundsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}