import { ChatService } from './chat.service'
import type { TripService } from '../trip/trip.service'
import type { PassengerService } from '../passenger/passenger.service'
import type { BusService } from '../bus/bus.service'
import type { ChatProviderRegistry } from './providers/chat-provider.registry'

describe('ChatService.buildContext (R10 snapshot, PII-light)', () => {
  const trips = {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 't1', name: 'hn-hp', status: 'IN_PROGRESS', description: 'desc',
        startDate: new Date('2026-05-22'), endDate: new Date('2026-05-25'),
        rounds: [{ status: 'IN_PROGRESS' }, { status: 'PLANNED' }],
      },
      {
        id: 't2', name: 'sapa', status: 'PLANNED', description: null,
        startDate: new Date('2026-08-01'), endDate: new Date('2026-08-04'),
        rounds: [],
      },
    ]),
  }
  // Một truy vấn đếm gom nhóm, chỉ đếm số lượng — hoàn toàn không có nguồn PII.
  const passengers = { countByTripForTenant: jest.fn().mockResolvedValue({ t1: 2 }) }
  const buses = { countForTenant: jest.fn().mockResolvedValue(3) }
  const registry = { resolve: () => ({ key: 'MOCK', answer: jest.fn().mockResolvedValue({ answer: 'A' }) }) }

  const service = new ChatService(
    trips as unknown as TripService,
    passengers as unknown as PassengerService,
    buses as unknown as BusService,
    registry as unknown as ChatProviderRegistry,
  )

  it('tallies status + passenger counts (tenant-scoped, single grouped count query)', async () => {
    const ctx = await service.buildContext('tenant-1')
    expect(trips.findAll).toHaveBeenCalledWith('tenant-1')
    expect(passengers.countByTripForTenant).toHaveBeenCalledWith('tenant-1')
    expect(buses.countForTenant).toHaveBeenCalledWith('tenant-1')
    expect(ctx.busCount).toBe(3)
    expect(ctx.operatorTripCount).toBe(2)
    expect(ctx.statusCounts).toEqual({ PLANNED: 1, IN_PROGRESS: 1, DONE: 0, CANCELLED: 0 })
    const hnhp = ctx.trips.find((t) => t.name === 'hn-hp')!
    expect(hnhp.passengerCount).toBe(2)
    expect(hnhp.roundCount).toBe(2)
    expect(hnhp.roundsInProgress).toBe(1)
    const sapa = ctx.trips.find((t) => t.name === 'sapa')!
    expect(sapa.passengerCount).toBe(0) // không có trong map đếm → 0
  })

  it('NEVER leaks passenger PII into the snapshot', async () => {
    const ctx = await service.buildContext('tenant-1')
    // Không có chuỗi số dài kiểu phone/idCard ở bất kỳ đâu trong snapshot đã serialize.
    expect(JSON.stringify(ctx)).not.toMatch(/\d{9,}/)
  })

  it('ask() returns the provider key', async () => {
    const res = await service.ask('tenant-1', { message: 'how many tours planned?' })
    expect(res).toEqual({ answer: 'A', provider: 'MOCK' })
  })
})
