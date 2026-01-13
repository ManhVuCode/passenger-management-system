// src/trips/trips.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrm
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Trip } from '../entities/trip.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, UserTenantRole])], // Đăng ký bảng
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}