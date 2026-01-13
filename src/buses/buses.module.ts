import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { Bus } from '../entities/bus.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bus, UserTenantRole])],
  controllers: [BusesController],
  providers: [BusesService],
})
export class BusesModule {}