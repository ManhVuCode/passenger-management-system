import { NotFoundException } from '@nestjs/common'
import { NotificationService } from './notification.service'
import type { PrismaService } from '../../prisma/prisma.service'
import type { ConfigService } from '@nestjs/config'
import type { AttendanceGateway } from '../../gateway/attendance.gateway'
import type { ProviderRegistry } from './providers/provider.registry'
import type { NotificationSender } from './notification.sender'
import type { TemplateService } from './templates/template.service'
import type { Queue } from 'bullmq'

describe('NotificationService — RSVP intent (C3/C5, intent-only)', () => {
  const notificationLog = {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  }
  // Deliberately NO attendanceRecord on the mock: if the code ever touched it,
  // these tests would throw — proving rsvp never reaches attendance.
  const prisma = { notificationLog } as unknown as PrismaService

  const service = new NotificationService(
    prisma,
    {} as unknown as ConfigService,
    {} as unknown as AttendanceGateway,
    {} as unknown as ProviderRegistry,
    {} as unknown as NotificationSender,
    {} as unknown as TemplateService,
    {} as unknown as Queue,
  )

  beforeEach(() => jest.clearAllMocks())

  it('records press-1 as rsvp on the voice log row — and writes nothing else', async () => {
    notificationLog.findFirst.mockResolvedValue({ id: 'log-1' })
    notificationLog.update.mockResolvedValue({ id: 'log-1', rsvp: 'WILL_BOARD' })

    await service.setRsvpIntent('tenant-1', 'log-1', 'WILL_BOARD')

    expect(notificationLog.findFirst).toHaveBeenCalledWith({
      where: { id: 'log-1', tenantId: 'tenant-1', channel: 'VOICE', status: { in: ['DELIVERED', 'SENT'] } },
      select: { id: true },
    })
    expect(notificationLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { rsvp: 'WILL_BOARD' },
    })
  })

  it('rejects a log that is not a voice row in this tenant', async () => {
    notificationLog.findFirst.mockResolvedValue(null)
    await expect(service.setRsvpIntent('tenant-1', 'nope', 'WONT_BOARD')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(notificationLog.update).not.toHaveBeenCalled()
  })

  it('tallies boarding intent across a round’s voice calls', async () => {
    notificationLog.findMany.mockResolvedValue([
      { status: 'DELIVERED', rsvp: 'WILL_BOARD' },
      { status: 'DELIVERED', rsvp: 'WONT_BOARD' },
      { status: 'DELIVERED', rsvp: null },
      { status: 'NO_ANSWER', rsvp: null },
      { status: 'QUEUED', rsvp: null },
      { status: 'FAILED', rsvp: null },
    ])

    const s = await service.getVoiceIntent('trip-1', 'tenant-1', 'round-1')

    expect(s).toEqual({
      total: 6,
      answered: 3,
      noAnswer: 1,
      pending: 1,
      failed: 1,
      willBoard: 1,
      wontBoard: 1,
    })
    expect(notificationLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', tripId: 'trip-1', channel: 'VOICE', roundId: 'round-1' },
      select: { status: true, rsvp: true },
    })
  })
})
