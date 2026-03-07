import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Round } from '../entities/round.entity';
import { Passenger } from '../entities/passenger.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, Round, Passenger, UserTenantRole])
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}