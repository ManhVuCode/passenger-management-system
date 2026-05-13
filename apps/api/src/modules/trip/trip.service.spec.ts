import { Test } from '@nestjs/testing'
import { TripService } from './trip.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException } from '@nestjs/common'
import { TripStatus, RoundStatus } from '@pms/shared'

const mockPrisma = {
  trip: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  round: {
    findMany: jest.fn(),
  },
}

describe('TripService', () => {
  let service: TripService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(TripService)
    jest.clearAllMocks()
  })

  describe('deriveTripStatus', () => {
    it('no rounds → PLANNED', async () => {
      mockPrisma.round.findMany.mockResolvedValue([])
      expect(await service.deriveTripStatus('t1')).toBe(TripStatus.PLANNED)
    })

    it('any round IN_PROGRESS → IN_PROGRESS', async () => {
      mockPrisma.round.findMany.mockResolvedValue([
        { status: RoundStatus.PLANNED },
        { status: RoundStatus.IN_PROGRESS },
      ])
      expect(await service.deriveTripStatus('t1')).toBe(TripStatus.IN_PROGRESS)
    })

    it('all rounds DONE → DONE', async () => {
      mockPrisma.round.findMany.mockResolvedValue([
        { status: RoundStatus.DONE },
        { status: RoundStatus.DONE },
      ])
      expect(await service.deriveTripStatus('t1')).toBe(TripStatus.DONE)
    })

    it('all rounds CANCELLED → CANCELLED', async () => {
      mockPrisma.round.findMany.mockResolvedValue([
        { status: RoundStatus.CANCELLED },
        { status: RoundStatus.CANCELLED },
      ])
      expect(await service.deriveTripStatus('t1')).toBe(TripStatus.CANCELLED)
    })

    it('mix DONE + CANCELLED → DONE', async () => {
      mockPrisma.round.findMany.mockResolvedValue([
        { status: RoundStatus.DONE },
        { status: RoundStatus.CANCELLED },
      ])
      expect(await service.deriveTripStatus('t1')).toBe(TripStatus.DONE)
    })
  })

  describe('create', () => {
    it('name with "/" → BadRequestException', async () => {
      await expect(
        service.create('tenant1', {
          name: 'Hanoi/Sapa',
          startDate: '2026-01-01',
          endDate: '2026-01-03',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('valid name → calls prisma.trip.create', async () => {
      mockPrisma.trip.create.mockResolvedValue({ id: 'trip1', name: 'Hanoi to Sapa' })
      await service.create('tenant1', {
        name: 'Hanoi to Sapa',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      })
      expect(mockPrisma.trip.create).toHaveBeenCalled()
    })
  })
})
