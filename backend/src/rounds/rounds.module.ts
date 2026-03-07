import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { Round } from '../entities/round.entity';
import { Trip } from '../entities/trip.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity'; // <--- 1. Import cái này

@Module({
  imports: [
    TypeOrmModule.forFeature([Round, Trip, UserTenantRole]) 
  ],
  controllers: [RoundsController],
  providers: [RoundsService],
})
export class RoundsModule {}