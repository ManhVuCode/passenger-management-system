import { Module } from '@nestjs/common'
import { TelegramApiService } from './telegram-api.service'
import { TelegramService } from './telegram.service'
import { TelegramPollerService } from './telegram-poller.service'

/**
 * Bot đăng ký Telegram (mỗi nhà xe một bot). Chạy long-polling để nhận /start + số điện
 * thoại của hành khách rồi tự gắn telegramChatId. Việc GỬI thông báo nằm ở
 * TelegramProvider trong NotificationModule.
 */
@Module({
  providers: [TelegramApiService, TelegramService, TelegramPollerService],
  exports: [TelegramApiService],
})
export class TelegramModule {}
