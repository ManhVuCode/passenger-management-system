import { Test } from '@nestjs/testing'
import { NotificationDispatcher } from './notification.dispatcher'
import { NotificationService } from './notification.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('NotificationDispatcher (B2 — autoRules gate, default off)', () => {
  let dispatcher: NotificationDispatcher

  const mockPrisma = {
    tenantNotificationConfig: { findUnique: jest.fn() },
  }
  const mockService = {
    sendAutomated: jest.fn(),
  }

  const payload = { tenantId: 'tenant-1', tripId: 'trip-1', roundId: 'round-1' }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationDispatcher,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockService },
      ],
    }).compile()
    dispatcher = moduleRef.get(NotificationDispatcher)
    mockService.sendAutomated.mockResolvedValue({ sent: 3, skipped: 0 })
  })

  it('does NOT send when no config exists (opt-in default off)', async () => {
    mockPrisma.tenantNotificationConfig.findUnique.mockResolvedValue(null)
    await dispatcher.onRoundStarted(payload)
    expect(mockService.sendAutomated).not.toHaveBeenCalled()
  })

  it('does NOT send when the matching rule is false', async () => {
    mockPrisma.tenantNotificationConfig.findUnique.mockResolvedValue({
      autoRules: { roundStarted: false },
    })
    await dispatcher.onRoundStarted(payload)
    expect(mockService.sendAutomated).not.toHaveBeenCalled()
  })

  it('sends with ROUND_STARTED/round.started when the rule is enabled', async () => {
    mockPrisma.tenantNotificationConfig.findUnique.mockResolvedValue({
      autoRules: { roundStarted: true },
    })
    await dispatcher.onRoundStarted(payload)
    expect(mockService.sendAutomated).toHaveBeenCalledWith({
      ...payload,
      trigger: 'ROUND_STARTED',
      templateKey: 'round.started',
    })
  })

  it('maps cancelled events to the roundCancelled rule', async () => {
    mockPrisma.tenantNotificationConfig.findUnique.mockResolvedValue({
      autoRules: { roundStarted: true, roundCancelled: false },
    })
    await dispatcher.onRoundCancelled(payload)
    expect(mockService.sendAutomated).not.toHaveBeenCalled()
  })

  it('swallows send errors so the emitting request is never affected', async () => {
    mockPrisma.tenantNotificationConfig.findUnique.mockResolvedValue({
      autoRules: { roundCompleted: true },
    })
    mockService.sendAutomated.mockRejectedValue(new Error('boom'))
    await expect(dispatcher.onRoundCompleted(payload)).resolves.toBeUndefined()
  })
})
