import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { AssignmentService } from './assignment.service'
import { PrismaService } from '../../prisma/prisma.service'
import { Role } from '@pms/shared'

describe('AssignmentService.assignBusManager (R4: 1 driver per round)', () => {
  let service: AssignmentService

  const mockPrisma = {
    roundBusAssignment: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
    busManagerAssignment: { findFirst: jest.fn(), upsert: jest.fn() },
  }

  const tenantId = 'tenant-1'

  function assign() {
    return service.assignBusManager('trip-1', 'round-1', 'bus-1', tenantId, {
      userId: 'driver-1',
    })
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [AssignmentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()
    service = moduleRef.get(AssignmentService)

    // happy-path defaults
    mockPrisma.roundBusAssignment.findUnique.mockResolvedValue({ tenantId })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'driver-1', role: Role.BUS_MANAGER })
    mockPrisma.busManagerAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.busManagerAssignment.upsert.mockResolvedValue({ id: 'bma-1' })
  })

  it('assigns the driver when free in the round', async () => {
    await expect(assign()).resolves.toEqual({ id: 'bma-1' })
    expect(mockPrisma.busManagerAssignment.upsert).toHaveBeenCalled()
  })

  it('throws 409 ConflictException when the driver is already on another bus in the same round', async () => {
    mockPrisma.busManagerAssignment.findFirst.mockResolvedValue({ id: 'bma-other', busId: 'bus-2' })
    await expect(assign()).rejects.toBeInstanceOf(ConflictException)
    expect(mockPrisma.busManagerAssignment.upsert).not.toHaveBeenCalled()
  })

  it('only conflicts on a DIFFERENT bus (NOT busId) — re-assigning the same bus is allowed', async () => {
    await assign()
    expect(mockPrisma.busManagerAssignment.findFirst).toHaveBeenCalledWith({
      where: { tripId: 'trip-1', roundId: 'round-1', userId: 'driver-1', NOT: { busId: 'bus-1' } },
    })
  })

  it('throws 404 when the bus is not assigned to this round', async () => {
    mockPrisma.roundBusAssignment.findUnique.mockResolvedValue(null)
    await expect(assign()).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws 404 (cross-tenant) when the RoundBusAssignment belongs to another tenant', async () => {
    mockPrisma.roundBusAssignment.findUnique.mockResolvedValue({ tenantId: 'other-tenant' })
    await expect(assign()).rejects.toBeInstanceOf(NotFoundException)
  })
})
