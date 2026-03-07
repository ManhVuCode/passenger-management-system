import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Passenger } from '../entities/passenger.entity';
import { TripAssignment } from '../entities/trip-assignment.entity';
import { Trip } from '../entities/trip.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Passenger, TripAssignment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

