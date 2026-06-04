import { VoiceProvider } from './voice.provider'
import { MockProvider } from './mock.provider'
import type { ConfigService } from '@nestjs/config'

describe('VoiceProvider (C — deterministic call simulator)', () => {
  const config = { get: jest.fn().mockReturnValue('MOCK') } as unknown as ConfigService
  let mock: MockProvider
  let provider: VoiceProvider

  const payload = (to: string) => ({ to, body: 'Xin mời quý khách lên xe', tenantId: 't1' })
  // Dải số trải đều để bucket kết quả 0–99 được lấy mẫu tốt.
  const numbers = Array.from({ length: 120 }, (_, i) => `+84${900000000 + i * 1234567}`)

  beforeEach(() => {
    mock = {
      send: jest.fn().mockResolvedValue({ success: true, providerId: 'mock-voice' }),
    } as unknown as MockProvider
    provider = new VoiceProvider(config, mock)
  })

  it('plays the TTS script through the mock (dial + speak)', async () => {
    await provider.send(payload('+84900000001'))
    expect(mock.send).toHaveBeenCalledWith('VOICE', expect.objectContaining({ to: '+84900000001' }))
  })

  it('is deterministic: same number → identical outcome', async () => {
    const a = await provider.send(payload('+84912345678'))
    const b = await provider.send(payload('+84912345678'))
    expect(b).toEqual(a)
  })

  it('produces a realistic spread of outcomes (answered, no-answer, busy)', async () => {
    const results = await Promise.all(numbers.map((n) => provider.send(payload(n))))
    expect(results.filter((r) => !r.success && r.error === 'BUSY').length).toBeGreaterThan(0)
    expect(results.filter((r) => r.status === 'NO_ANSWER').length).toBeGreaterThan(0)
    expect(results.filter((r) => r.status === 'DELIVERED').length).toBeGreaterThan(0)
  })

  it('auto-registers press-1 RSVP intent only on answered calls', async () => {
    const results = await Promise.all(numbers.map((n) => provider.send(payload(n))))
    const intents = results.map((r) => r.rsvp).filter(Boolean)
    expect(intents).toContain('WILL_BOARD')
    expect(intents).toContain('WONT_BOARD')
    for (const r of results) {
      if (r.rsvp) expect(r.status).toBe('DELIVERED')
    }
  })
})
