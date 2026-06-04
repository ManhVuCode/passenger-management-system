import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { NotificationController } from './notification.controller'
import { NotificationHistoryController } from './notification-history.controller'
import { NotificationConfigController } from './notification-config.controller'
import { NotificationService } from './notification.service'
import { NotificationSender } from './notification.sender'
import { NotificationProcessor } from './notification.processor'
import { NotificationDispatcher } from './notification.dispatcher'
import { BoardingReminderScheduler } from './boarding-reminder.scheduler'
import { TemplateService } from './templates/template.service'
import { ProviderRegistry } from './providers/provider.registry'
import { MockProvider } from './providers/mock.provider'
import { SmsProvider } from './providers/sms.provider'
import { TeamsProvider } from './providers/teams.provider'
import { VoiceProvider } from './providers/voice.provider'
import { ZaloProvider } from './providers/zalo.provider'
import { GatewayModule } from '../../gateway/gateway.module'
import { NOTIFICATION_QUEUE } from '../queue/queue.module'

@Module({
  imports: [GatewayModule, BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  controllers: [NotificationController, NotificationHistoryController, NotificationConfigController],
  providers: [
    NotificationService,
    NotificationSender,
    NotificationProcessor,
    NotificationDispatcher,
    BoardingReminderScheduler,
    TemplateService,
    ProviderRegistry,
    MockProvider,
    SmsProvider,
    TeamsProvider,
    VoiceProvider,
    ZaloProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
