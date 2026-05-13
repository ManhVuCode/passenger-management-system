import { Module } from '@nestjs/common'
import { MeController } from './me.controller'
import { AttendanceModule } from '../attendance/attendance.module'

@Module({
  imports: [AttendanceModule],
  controllers: [MeController],
})
export class MeModule {}
