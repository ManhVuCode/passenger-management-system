import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TelegramApiService } from './telegram-api.service'
import { TelegramService } from './telegram.service'

/**
 * Khởi động một vòng long-polling getUpdates cho MỖI tenant đã cấu hình bot token
 * (mỗi nhà xe một bot). Không cần URL public — chạy được trên localhost. Không có
 * token nào thì đứng im nhưng vẫn SẴN SÀNG: admin lưu token qua UI sẽ gọi
 * startForTenant() để bật bot ngay mà KHÔNG cần restart API.
 */
@Injectable()
export class TelegramPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollerService.name)
  private destroyed = false
  private readonly tokens = new Map<string, string>() // tenantId -> token đang dùng
  private readonly offsets = new Map<string, number>() // tenantId -> getUpdates offset
  private readonly aborts = new Map<string, AbortController>() // tenantId -> request đang treo

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
    for (const c of configs) this.startForTenant(c.tenantId, c.telegramBotToken!)
    this.logger.log(
      configs.length > 0
        ? `Telegram bot đăng ký đang polling cho ${configs.length} nhà xe.`
        : 'Chưa nhà xe nào cấu hình Telegram bot token — bot đăng ký đang nghỉ (sẵn sàng bật khi cấu hình).',
    )
  }

  onModuleDestroy(): void {
    this.destroyed = true
    for (const c of this.aborts.values()) c.abort()
    this.tokens.clear()
  }

  /** Bật/đổi bot cho một tenant lúc đang chạy (gọi khi admin lưu token mới). */
  startForTenant(tenantId: string, token: string): void {
    if (this.destroyed) return
    const prev = this.tokens.get(tenantId)
    if (prev === token) return
    const isNew = prev === undefined
    this.tokens.set(tenantId, token)
    if (!isNew) this.offsets.set(tenantId, 0) // bot mới → đọc update lại từ đầu
    void this.api.setMyCommands(token)
    // Hủy request getUpdates đang treo để vòng lặp lấy token mới ngay lập tức.
    this.aborts.get(tenantId)?.abort()
    if (isNew) void this.pollLoop(tenantId)
    this.logger.log(`Telegram bot ${isNew ? 'bật' : 'đổi token'} cho tenant ${tenantId}.`)
  }

  /** Tắt bot cho một tenant (admin gỡ token). Vòng lặp tự thoát ở nhịp kế tiếp. */
  stopForTenant(tenantId: string): void {
    if (!this.tokens.has(tenantId)) return
    this.tokens.delete(tenantId)
    this.offsets.delete(tenantId)
    this.aborts.get(tenantId)?.abort()
    this.logger.log(`Telegram bot tắt cho tenant ${tenantId}.`)
  }

  private async pollLoop(tenantId: string): Promise<void> {
    while (!this.destroyed && this.tokens.has(tenantId)) {
      const token = this.tokens.get(tenantId)!
      const offset = this.offsets.get(tenantId) ?? 0
      const ctrl = new AbortController()
      this.aborts.set(tenantId, ctrl)
      try {
        const updates = await this.api.getUpdates(token, offset, 30, ctrl.signal)
        for (const u of updates) {
          this.offsets.set(tenantId, u.update_id + 1)
          try {
            await this.bot.handleUpdate(tenantId, token, u)
          } catch (e) {
            this.logger.warn(`handleUpdate lỗi (tenant ${tenantId}): ${(e as Error).message}`)
          }
        }
      } catch (e) {
        // Bị abort khi đổi/tắt token là bình thường — không cảnh báo, không nghỉ.
        if (!this.destroyed && this.tokens.has(tenantId) && (e as Error).name !== 'AbortError') {
          this.logger.warn(`getUpdates lỗi (tenant ${tenantId}): ${(e as Error).message}`)
          await new Promise((r) => setTimeout(r, 3000))
        }
      } finally {
        if (this.aborts.get(tenantId) === ctrl) this.aborts.delete(tenantId)
      }
    }
  }
}
