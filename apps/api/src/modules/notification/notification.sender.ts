import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ProviderRegistry } from './providers/provider.registry'
import type { SendJobData } from './notification.types'

/**
 * Performs one delivery and records its outcome on the existing NotificationLog
 * row (created as QUEUED by the service). Shared by the BullMQ processor and the
 * synchronous fallback path, so behaviour is identical whether queued or inline.
 *
 * Throws on provider failure so BullMQ retries; the log row is left FAILED, which
 * doubles as the dead-letter record after the final attempt.
 */
@Injectable()
export class NotificationSender {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
  ) {}

  async deliver(data: SendJobData): Promise<void> {
    const provider = this.registry.get(data.channel)
    if (!provider) {
      await this.prisma.notificationLog.update({
        where: { id: data.logId },
        data: { status: 'FAILED', errorReason: 'NO_PROVIDER' },
      })
      return
    }

    const result = await provider.send(data.payload)
    await this.prisma.notificationLog.update({
      where: { id: data.logId },
      data: {
        // A provider may report a terminal status (e.g. voice NO_ANSWER); otherwise
        // fall back to the success→SENT / failure→FAILED default.
        status: result.status ?? (result.success ? 'SENT' : 'FAILED'),
        providerId: result.providerId,
        costMicro: result.costMicro,
        errorReason: result.error,
        // An IVR press-1 reply is intent only — recorded here, never on attendance.
        ...(result.rsvp ? { rsvp: result.rsvp } : {}),
      },
    })

    if (!result.success) {
      throw new Error(result.error ?? 'send failed')
    }
  }
}
