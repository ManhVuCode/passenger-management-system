import { Module } from '@nestjs/common'
import { AttendanceGateway } from './attendance.gateway'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  providers: [AttendanceGateway],
  exports: [AttendanceGateway],
})
export class GatewayModule {}
