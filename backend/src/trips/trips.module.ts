// src/trips/trips.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrm
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripAssignmentsController } from './trip-assignments.controller';
import { Trip } from '../entities/trip.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { TripAssignment } from '../entities/trip-assignment.entity';
import { Bus } from '../entities/bus.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, UserTenantRole, TripAssignment, Bus, User])],
  controllers: [TripsController, TripAssignmentsController],
  providers: [TripsService],
})
export class TripsModule {}
