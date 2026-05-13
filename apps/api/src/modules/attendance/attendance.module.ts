import { Module } from '@nestjs/common'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { GatewayModule } from '../../gateway/gateway.module'

@Module({
  imports: [GatewayModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
