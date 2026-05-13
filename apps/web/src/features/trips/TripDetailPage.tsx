import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGetTripQuery } from './tripsApi'
import { useGetPassengersQuery } from '../passengers/passengerApi'
import {
  useGetAllocationsByRoundQuery,
  useAllocatePassengersMutation,
  useMovePassengerMutation,
  useRemoveAllocationMutation,
} from '../allocation/allocationApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { ChevronRight, Users, Bus, ArrowRight } from 'lucide-react'
import { TripStatus, RoundStatus, type Round } from '@pms/shared'

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'destructive',
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { data: trip, isLoading } = useGetTripQuery(tripId!)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  if (isLoading) return <div className="p-8 text-slate-400">Loading trip…</div>
  if (!trip) return <div className="p-8 text-red-400">Trip not found</div>

  const rounds = trip.rounds ?? []
  const selected = rounds.find((r) => r.id === selectedRound)

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/trips" className="hover:text-primary">Trips</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700 font-medium">{trip.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{trip.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(trip.startDate).toLocaleDateString()} →{' '}
            {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[trip.status as TripStatus] ?? 'secondary'}>
            {trip.status}
          </Badge>
          <Link to={`/trips/${tripId}/passengers`}>
            <Button variant="outline" size="sm">
              <Users size={14} className="mr-1.5" /> Manage Passengers
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {rounds.map((round) => (
          <Card
            key={round.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRound === round.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Round {round.sequence}: {round.name}
                </CardTitle>
                <Badge variant={STATUS_BADGE[round.status] ?? 'secondary'}>
                  {round.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                {round.departurePoint} <ArrowRight size={10} /> {round.arrivalPoint}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selected && <AllocationPanel tripId={tripId!} round={selected} />}
    </div>
  )
}

function AllocationPanel({ tripId, round }: { tripId: string; round: Round }) {
  const roundId = round.id
  const { data: passengers = [] } = useGetPassengersQuery(tripId)
  const { data: allocations = [], isLoading } = useGetAllocationsByRoundQuery({ tripId, roundId })
  const [allocate, { isLoading: allocating }] = useAllocatePassengersMutation()
  const [movePassenger] = useMovePassengerMutation()
  const [removeAllocation] = useRemoveAllocationMutation()

  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])
  const [targetBusId, setTargetBusId] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [moveToBusId, setMoveToBusId] = useState('')

  const allocatedIds = new Set(allocations.map((a) => a.tripPassengerAssignmentId))
  const unallocated = passengers.filter((p) => !allocatedIds.has(p.id))
  const isPlanned = round.status === RoundStatus.PLANNED

  async function handleAllocate() {
    if (!selectedPassengers.length || !targetBusId) return
    const res = await allocate({ tripId, roundId, busId: targetBusId, passengerIds: selectedPassengers }).unwrap()
    setSelectedPassengers([])
    setTargetBusId('')
    if (res.capacityWarning) setWarning(res.capacityWarning.message)
  }

  async function handleMove(assignmentId: string) {
    if (!moveToBusId) return
    await movePassenger({ tripId, roundId, assignmentId, toBusId: moveToBusId })
    setMovingId(null)
    setMoveToBusId('')
  }

  const byBus = allocations.reduce<Record<string, typeof allocations>>((acc, a) => {
    const bid = a.roundBusAssignment?.busId ?? a.busId
    if (!acc[bid]) acc[bid] = []
    acc[bid].push(a)
    return acc
  }, {})

  if (isLoading) return <div className="text-slate-400 py-4">Loading allocations…</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Passenger Allocation — Round {round.name}
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({allocations.length} allocated, {unallocated.length} unallocated)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isPlanned && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Assign passengers to bus</p>
            {warning && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠️ {warning}
                <button className="ml-2 text-xs underline" onClick={() => setWarning(null)}>dismiss</button>
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <input
                className="flex-1 min-w-40 h-9 border border-border rounded-md px-3 text-sm"
                placeholder="Target Bus ID"
                value={targetBusId}
                onChange={(e) => setTargetBusId(e.target.value)}
              />
              <Button size="sm" onClick={handleAllocate} disabled={allocating || !selectedPassengers.length || !targetBusId}>
                <Bus size={13} className="mr-1.5" />
                Assign {selectedPassengers.length > 0 ? `(${selectedPassengers.length})` : ''}
              </Button>
            </div>
            {unallocated.length > 0 && (
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-auto">
                {unallocated.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPassengers.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPassengers([...selectedPassengers, p.id])
                        else setSelectedPassengers(selectedPassengers.filter((id) => id !== p.id))
                      }}
                    />
                    <span className="font-medium truncate">{p.name}</span>
                    {p.type && <Badge variant="secondary" className="text-xs">{p.type}</Badge>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {Object.keys(byBus).length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">No passengers allocated yet.</p>
        )}
        {Object.entries(byBus).map(([bid, busAllocs]) => (
          <div key={bid}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Bus size={11} />
              {busAllocs[0]?.roundBusAssignment?.bus?.name ?? `Bus ${bid.slice(0, 8)}`}
              <Badge variant="secondary">{busAllocs.length} pax</Badge>
            </p>
            <div className="space-y-1">
              {busAllocs.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-50 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.tripPassengerAssignment.name}</span>
                    {a.tripPassengerAssignment.type && (
                      <Badge variant="secondary" className="text-xs">{a.tripPassengerAssignment.type}</Badge>
                    )}
                    {a.attendanceRecord && (
                      <Badge
                        variant={a.attendanceRecord.status === 'JOIN' ? 'success' : a.attendanceRecord.status === 'ABSENT' ? 'warning' : 'destructive'}
                        className="text-xs"
                      >
                        {a.attendanceRecord.status}
                      </Badge>
                    )}
                  </div>
                  {isPlanned && (
                    <div className="flex items-center gap-1">
                      {movingId === a.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="h-7 w-40 border border-border rounded px-2 text-xs"
                            placeholder="New Bus ID"
                            value={moveToBusId}
                            onChange={(e) => setMoveToBusId(e.target.value)}
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleMove(a.id)}>Move</Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setMovingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMovingId(a.id)}>
                            Move
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-600"
                            onClick={() => removeAllocation({ tripId, roundId, assignmentId: a.id })}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
