import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { RoundsModule } from './rounds/rounds.module';
import { BusesModule } from './buses/buses.module';
import { PassengersModule } from './passengers/passengers.module';
import { AttendanceModule } from './attendance/attendance.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // ----------------------------------------------------
    // 1. Cau hinh doc file '.env'
    // ----------------------------------------------------
    ConfigModule.forRoot({
      isGlobal: true, //--> module nao cung doc duoc bien moi truong
    }),

    // ----------------------------------------------------
    // 2. Cau hinh doc ket noi database (PostgreSQL)
    // ----------------------------------------------------
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        
        // Tự động tìm và tạo bảng từ code Entity
        autoLoadEntities: true, // Tự động tìm tất cả file có đuôi .entity.ts để biến thành bảng
        synchronize: true, // Dev mode: Tự động sửa bảng khi sửa code
        ssl: false,        // Quan trọng: Tắt SSL để không bị lỗi kết nối
      }),
    }),

    AuthModule,

    TripsModule,

    RoundsModule,

    BusesModule,

    PassengersModule,

    AttendanceModule,

    UsersModule,

    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
