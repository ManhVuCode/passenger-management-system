import { Injectable, Logger } from '@nestjs/common'
import type { MessagePayload, SendResult } from './message-provider.interface'

/**
 * Default delivery backend used whenever a real provider is not configured
 * (no API keys / NODE_ENV=test). Logs the message and returns success, so the
 * whole pipeline (queue, logging, history UI) is fully demoable with zero
 * paid accounts. Other providers delegate here when in mock mode.
 */
@Injectable()
export class MockProvider {
  private readonly logger = new Logger(MockProvider.name)

  async send(channel: string, payload: MessagePayload): Promise<SendResult> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const preview = payload.body.length > 60 ? `${payload.body.slice(0, 60)}…` : payload.body
    this.logger.log(`[MOCK ${channel}] to=${payload.to} "${preview}" tenant=${payload.tenantId}`)
    return { success: true, providerId: `mock-${channel.toLowerCase()}` }
  }
}
