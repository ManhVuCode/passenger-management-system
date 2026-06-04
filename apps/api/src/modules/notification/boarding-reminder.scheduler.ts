import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { RoundStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationService } from './notification.service'
import { resolveAutoRules } from './notification.config'

const WINDOW_OPEN_MIN = 25
const WINDOW_CLOSE_MIN = 35

/**
 * B5 — fires a boarding reminder ~30 min before departure. Runs every 5 minutes;
 * the T+25..35 window guarantees each round is caught at least once, and the
 * per-recipient dedup in sendAutomated() keeps overlapping runs from re-sending.
 * Gated per tenant by autoRules.boardingReminder (default off).
 */
@Injectable()
export class BoardingReminderScheduler {
  private readonly logger = new Logger(BoardingReminderScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly service: NotificationService,
  ) {}

  @Cron('*/5 * * * *')
  async run(): Promise<void> {
    const now = new Date()
    const from = new Date(now.getTime() + WINDOW_OPEN_MIN * 60_000)
    const to = new Date(now.getTime() + WINDOW_CLOSE_MIN * 60_000)

    const rounds = await this.prisma.round.findMany({
      where: {
        scheduledDep: { gte: from, lte: to },
        status: { in: [RoundStatus.PLANNED, RoundStatus.IN_PROGRESS] },
      },
      select: { id: true, tripId: true, tenantId: true },
    })
    if (rounds.length === 0) return

    // One config lookup per tenant, not per round.
    const enabledByTenant = new Map<string, boolean>()
    for (const round of rounds) {
      let enabled = enabledByTenant.get(round.tenantId)
      if (enabled === undefined) {
        const config = await this.prisma.tenantNotificationConfig.findUnique({
          where: { tenantId: round.tenantId },
        })
        enabled = resolveAutoRules(config?.autoRules).boardingReminder
        enabledByTenant.set(round.tenantId, enabled)
      }
      if (!enabled) continue

      const result = await this.service.sendAutomated({
        tripId: round.tripId,
        roundId: round.id,
        tenantId: round.tenantId,
        trigger: 'BOARDING_REMINDER',
        templateKey: 'boarding.reminder',
        dedupe: true,
      })
      if (result.sent > 0 || result.skipped > 0) {
        this.logger.log(
          `boarding.reminder → ${round.id}: sent ${result.sent}, skipped ${result.skipped}`,
        )
      }
    }
  }
}
