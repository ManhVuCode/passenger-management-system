import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationService } from './notification.service'
import { RoundEvents, type RoundEventPayload } from '../../common/events/round.events'
import { resolveAutoRules, type AutoRuleKey } from './notification.config'

/**
 * B2 — biến các sự kiện thay đổi round-status đã commit thành thông báo tự động gửi hành khách.
 * Mỗi handler được kiểm soát bởi autoRules của tenant (mặc định TẮT — tự động hóa
 * bắt buộc phải bật thủ công). Chỉ là consumer thuần túy: không bao giờ thay đổi state của round/attendance.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly service: NotificationService,
  ) {}

  @OnEvent(RoundEvents.STARTED)
  async onRoundStarted(payload: RoundEventPayload): Promise<void> {
    await this.dispatch(payload, 'roundStarted', 'ROUND_STARTED', 'round.started')
  }

  @OnEvent(RoundEvents.CANCELLED)
  async onRoundCancelled(payload: RoundEventPayload): Promise<void> {
    await this.dispatch(payload, 'roundCancelled', 'ROUND_CANCELLED', 'round.cancelled')
  }

  @OnEvent(RoundEvents.COMPLETED)
  async onRoundCompleted(payload: RoundEventPayload): Promise<void> {
    await this.dispatch(payload, 'roundCompleted', 'ROUND_COMPLETED', 'round.completed')
  }

  private async dispatch(
    payload: RoundEventPayload,
    rule: AutoRuleKey,
    trigger: 'ROUND_STARTED' | 'ROUND_CANCELLED' | 'ROUND_COMPLETED',
    templateKey: 'round.started' | 'round.cancelled' | 'round.completed',
  ): Promise<void> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({
      where: { tenantId: payload.tenantId },
    })
    const rules = resolveAutoRules(config?.autoRules)
    if (!rules[rule]) return

    try {
      const result = await this.service.sendAutomated({ ...payload, trigger, templateKey })
      this.logger.log(
        `${trigger} → ${payload.roundId}: sent ${result.sent}, skipped ${result.skipped}`,
      )
    } catch (e) {
      // Tự động hóa không bao giờ được phép lan ngược lên request đã phát ra sự kiện.
      this.logger.error(`${trigger} dispatch failed for ${payload.roundId}: ${(e as Error).message}`)
    }
  }
}
