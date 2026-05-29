import { Test } from '@nestjs/testing'
import { AttendanceService } from './attendance.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AttendanceGateway } from '../../gateway/attendance.gateway'
import { ForbiddenException } from '@nestjs/common'
import { AttendanceStatus, Role } from '@pms/shared'

const mockPrisma = {
  busManagerAssignment: { findFirst: jest.fn() },
  roundBusAssignment: { findUnique: jest.fn() },
  roundPassengerAssignment: { findMany: jest.fn() },
  attendanceRecord: { upsert: jest.fn() },
  round: { findFirst: jest.fn() },
  $transaction: jest.fn(),
}

const mockGateway = {
  broadcastAttendanceUpdate: jest.fn(),
}

const baseDto = {
  roundPassengerAssignmentIds: ['rpa1'],
  status: AttendanceStatus.JOIN,
}

describe('AttendanceService — BusManager scope', () => {
  let service: AttendanceService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AttendanceGateway, useValue: mockGateway },
      ],
    }).compile()
    service = module.get(AttendanceService)
    jest.clearAllMocks()
  })

  it('BusManager with no assignment → ForbiddenException', async () => {
    mockPrisma.busManagerAssignment.findFirst.mockResolvedValue(null)

    await expect(
      service.markAttendance('t1', 'r1', 'b1', 'tenant1', baseDto, {
        userId: 'bm1',
        tenantId: 'tenant1',
        role: Role.BUS_MANAGER,
      }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('Admin skips BusManager scope check', async () => {
    mockPrisma.roundBusAssignment.findUnique.mockResolvedValue({ tenantId: 'tenant1' })
    mockPrisma.round.findFirst.mockResolvedValue({ status: 'PLANNED' })
    mockPrisma.roundPassengerAssignment.findMany
      .mockResolvedValueOnce([{ id: 'rpa1' }])
      .mockResolvedValueOnce([
        {
          id: 'rpa1',
          tripPassengerAssignment: { id: 'p1', name: 'Test' },
          roundBusAssignment: { tripId: 't1', roundId: 'r1', busId: 'b1' },
        },
      ])
    mockPrisma.$transaction.mockResolvedValue([
      { id: 'ar1', status: AttendanceStatus.JOIN },
    ])

    await service.markAttendance('t1', 'r1', 'b1', 'tenant1', baseDto, {
      userId: 'admin1',
      tenantId: 'tenant1',
      role: Role.ADMIN,
    })

    expect(mockPrisma.busManagerAssignment.findFirst).not.toHaveBeenCalled()
    expect(mockGateway.broadcastAttendanceUpdate).toHaveBeenCalled()
  })
})
