import { Test } from '@nestjs/testing'
import { AttendanceGateway } from './attendance.gateway'
import { JwtService } from '@nestjs/jwt'

describe('AttendanceGateway', () => {
  let gateway: AttendanceGateway

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AttendanceGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ userId: 'u1', tenantId: 't1', role: 'ADMIN' }),
          },
        },
      ],
    }).compile()
    gateway = module.get(AttendanceGateway)
  })

  it('should be defined', () => {
    expect(gateway).toBeDefined()
  })

  it('broadcastAttendanceUpdate does not throw when server is mocked', () => {
    gateway['server'] = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as never
    expect(() =>
      gateway.broadcastAttendanceUpdate({
        tripId: 't1',
        roundId: 'r1',
        busId: 'b1',
        passengerId: 'p1',
        passengerName: 'Test',
        status: 'JOIN',
        markedBy: 'u1',
        markedAt: new Date().toISOString(),
      }),
    ).not.toThrow()
  })

  it('broadcastRoundStatusUpdate emits to room', () => {
    const emit = jest.fn()
    const to = jest.fn().mockReturnValue({ emit })
    gateway['server'] = { to } as never
    gateway.broadcastRoundStatusUpdate({ tripId: 't1', roundId: 'r1', status: 'IN_PROGRESS' })
    expect(to).toHaveBeenCalledWith('trip:t1')
    expect(emit).toHaveBeenCalledWith('round:status-updated', {
      tripId: 't1',
      roundId: 'r1',
      status: 'IN_PROGRESS',
    })
  })
})
