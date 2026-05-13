import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { GatewayModule } from '../../gateway/gateway.module'

@Module({
  imports: [GatewayModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
