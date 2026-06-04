import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'

/**
 * Teams adapter (staff/ops channel). Posts a MessageCard to TEAMS_WEBHOOK_URL.
 * Falls back to a dev log when the webhook is unset. Logic moved verbatim from
 * the former NotificationService.sendTeams().
 *
 * Note: this is a STAFF channel, never a passenger-reach channel. The MessageCard
 * webhook is a legacy Microsoft connector (being retired in favour of Workflows /
 * Adaptive Cards) — fine for the thesis demo, flag for production.
 */
@Injectable()
export class TeamsProvider implements IMessageProvider {
  readonly channel = 'TEAMS'
  private readonly logger = new Logger(TeamsProvider.name)

  constructor(private readonly config: ConfigService) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const webhookUrl = this.config.get<string>('TEAMS_WEBHOOK_URL')
    if (!webhookUrl) {
      this.logger.log(`[DEV TEAMS] ${payload.body}`)
      return { success: true, providerId: 'dev-teams' }
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          summary: payload.body,
          sections: [{ activityTitle: payload.body }],
        }),
      })
      return res.ok
        ? { success: true, providerId: 'teams' }
        : { success: false, error: `HTTP ${res.status}` }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
