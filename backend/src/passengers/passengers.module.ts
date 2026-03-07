import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassengersService } from './passengers.service';
import { PassengersController } from './passengers.controller';
import { Passenger } from '../entities/passenger.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { Trip } from '../entities/trip.entity'; // <--- Import Trip
import { Bus } from '../entities/bus.entity';   // <--- Import Bus

@Module({
  imports: [
    // Đăng ký đủ 4 bảng này để Service dùng thoải mái
    TypeOrmModule.forFeature([Passenger, UserTenantRole, Trip, Bus]) 
  ],
  controllers: [PassengersController],
  providers: [PassengersService],
})
export class PassengersModule {}