import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TelegramApiService } from './telegram-api.service'
import { TelegramService } from './telegram.service'

/**
 * Khởi động một vòng long-polling getUpdates cho MỖI tenant đã cấu hình bot token
 * (mỗi nhà xe một bot). Không cần URL public — chạy được trên localhost. Không có
 * token nào thì đứng im.
 */
@Injectable()
export class TelegramPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollerService.name)
  private running = false
  private readonly controllers = new Set<AbortController>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: TelegramApiService,
    private readonly bot: TelegramService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return
    const configs = await this.prisma.tenantNotificationConfig.findMany({
      where: { telegramBotToken: { not: null } },
      select: { tenantId: true, telegramBotToken: true },
    })
    if (configs.length === 0) {
      this.logger.log('Chưa nhà xe nào cấu hình Telegram bot token — bot đăng ký đang nghỉ.')
      return
    }
    this.running = true
    for (const c of configs) {
      void this.api.setMyCommands(c.telegramBotToken!)
      void this.pollLoop(c.tenantId, c.telegramBotToken!)
    }
    this.logger.log(`Telegram bot đăng ký đang polling cho ${configs.length} nhà xe.`)
  }

  onModuleDestroy(): void {
    this.running = false
    for (const c of this.controllers) c.abort()
  }

  private async pollLoop(tenantId: string, token: string): Promise<void> {
    let offset = 0
    while (this.running) {
      const ctrl = new AbortController()
      this.controllers.add(ctrl)
      try {
        const updates = await this.api.getUpdates(token, offset, 30, ctrl.signal)
        for (const u of updates) {
          offset = u.update_id + 1
          try {
            await this.bot.handleUpdate(tenantId, token, u)
          } catch (e) {
            this.logger.warn(`handleUpdate lỗi (tenant ${tenantId}): ${(e as Error).message}`)
          }
        }
      } catch (e) {
        if (this.running) {
          this.logger.warn(`getUpdates lỗi (tenant ${tenantId}): ${(e as Error).message}`)
          await new Promise((r) => setTimeout(r, 3000))
        }
      } finally {
        this.controllers.delete(ctrl)
      }
    }
  }
}
