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
    await this.dispatchEmailReport(payload)
    await this.dispatchTripEmailReport(payload)
  }

  /** Email báo cáo điểm danh cho Admin khi round hoàn thành — công tắc riêng (emailReport). */
  private async dispatchEmailReport(payload: RoundEventPayload): Promise<void> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({
      where: { tenantId: payload.tenantId },
    })
    if (!resolveAutoRules(config?.autoRules).emailReport) return

    try {
      const result = await this.service.sendAttendanceReportEmail(payload)
      this.logger.log(
        `EMAIL_REPORT → ${payload.roundId}: sent ${result.sent}, skipped ${result.skipped}`,
      )
    } catch (e) {
      // Tự động hóa không bao giờ được phép lan ngược lên request đã phát ra sự kiện.
      this.logger.error(
        `EMAIL_REPORT dispatch failed for ${payload.roundId}: ${(e as Error).message}`,
      )
    }
  }

  /** Email báo cáo XLSX tổng hợp khi CẢ chuyến kết thúc — cùng công tắc emailReport. */
  private async dispatchTripEmailReport(payload: RoundEventPayload): Promise<void> {
    const config = await this.prisma.tenantNotificationConfig.findUnique({
      where: { tenantId: payload.tenantId },
    })
    if (!resolveAutoRules(config?.autoRules).emailReport) return
    if (!(await this.isTripComplete(payload.tripId))) return

    try {
      const result = await this.service.sendTripAttendanceReportEmail({
        tenantId: payload.tenantId,
        tripId: payload.tripId,
      })
      this.logger.log(
        `EMAIL_REPORT(trip) → ${payload.tripId}: sent ${result.sent}, skipped ${result.skipped}`,
      )
    } catch (e) {
      this.logger.error(
        `EMAIL_REPORT(trip) dispatch failed for ${payload.tripId}: ${(e as Error).message}`,
      )
    }
  }

  /** Trip coi như đã kết thúc khi có ≥1 chặng, mọi chặng đều DONE/CANCELLED và không
   *  phải tất cả đều CANCELLED — khớp nhánh DONE của TripService.deriveTripStatus. */
  private async isTripComplete(tripId: string): Promise<boolean> {
    const rounds = await this.prisma.round.findMany({
      where: { tripId },
      select: { status: true },
    })
    if (rounds.length === 0) return false
    const s = rounds.map((r) => r.status)
    if (s.some((x) => x === 'IN_PROGRESS' || x === 'PLANNED')) return false
    if (s.every((x) => x === 'CANCELLED')) return false
    return s.every((x) => x === 'DONE' || x === 'CANCELLED')
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
