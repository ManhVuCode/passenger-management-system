import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IMessageProvider, MessagePayload, SendResult } from './message-provider.interface'
import type { NotificationStatus, RsvpIntent } from '../notification.types'
import { MockProvider } from './mock.provider'

/**
 * Voice adapter (outbound call). For the thesis demo this is a deterministic
 * call SIMULATOR — it "plays" the Vietnamese TTS script and returns a realistic
 * call result. A real provider (Stringee / Twilio Voice + IVR) drops in behind
 * the same seam: set VOICE_PROVIDER and implement the branch — the dispatcher,
 * queue, sender, and NotificationLog pipeline stay unchanged.
 */
@Injectable()
export class VoiceProvider implements IMessageProvider {
  readonly channel = 'VOICE'
  private readonly logger = new Logger(VoiceProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockProvider,
  ) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    const backend = (this.config.get<string>('VOICE_PROVIDER') ?? 'MOCK').toUpperCase()
    if (backend !== 'MOCK') {
      // No real telephony wired for the thesis — fall back to the simulator rather
      // than silently dropping the call.
      this.logger.warn(`VOICE_PROVIDER=${backend} not implemented; using call simulator`)
    }
    return this.simulateCall(payload)
  }

  /**
   * Deterministic outbound-call simulator: the same phone always yields the same
   * outcome (reproducible tests + demos). Outcomes:
   *  - ~8%  BUSY  → transient failure (queue retries, then settles FAILED)
   *  - ~22% NO_ANSWER → terminal call result (no retry)
   *  - ~70% ANSWERED (DELIVERED), TTS played; a slice auto-register a press-1 RSVP
   *         INTENT — recorded on NotificationLog.rsvp ONLY, never as attendance.
   */
  private async simulateCall(payload: MessagePayload): Promise<SendResult> {
    // Reuse the mock for the "[MOCK VOICE] speaking …" log line + dial delay.
    await this.mock.send('VOICE', payload)
    const seed = seedFromContact(payload.to)
    const providerId = `mock-voice-${seed}`

    if (seed < 8) {
      return { success: false, error: 'BUSY', providerId }
    }
    if (seed < 30) {
      const status: NotificationStatus = 'NO_ANSWER'
      return { success: true, status, providerId, costMicro: 150 }
    }
    const status: NotificationStatus = 'DELIVERED'
    const rsvp = autoRsvp(seed)
    return { success: true, status, providerId, costMicro: 800, ...(rsvp ? { rsvp } : {}) }
  }
}

/** Stable 0–99 bucket from a contact string (no RNG → reproducible). */
function seedFromContact(contact: string): number {
  let h = 0
  for (const ch of contact) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 100
}

/** Auto-simulated IVR press: a minority of answered calls confirm their intent. */
function autoRsvp(seed: number): RsvpIntent | null {
  if (seed % 5 === 0) return 'WILL_BOARD'
  if (seed % 5 === 1) return 'WONT_BOARD'
  return null
}
