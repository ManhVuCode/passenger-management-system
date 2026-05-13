import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useGetTripQuery } from './tripsApi'
import { useGetPassengersQuery } from '../passengers/passengerApi'
import {
  useGetAllocationsByRoundQuery,
  useAllocatePassengersMutation,
  useMovePassengerMutation,
  useRemoveAllocationMutation,
  useOverrideAttendanceMutation,
} from '../allocation/allocationApi'
import { useAppSelector } from '../../store/hooks'
import NotificationPanel from '../notifications/NotificationPanel'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Bus as BusIcon,
  MapPin,
  Clock,
  Activity,
  AlertCircle,
  Share2,
  X,
} from 'lucide-react'
import { RoundStatus, type Round } from '@pms/shared'
import type { BadgeVariant } from '../../components/ui/badge'
import { cn } from '../../lib/utils'

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { data: trip, isLoading } = useGetTripQuery(tripId!)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)

  if (isLoading) return <div className="p-8 text-gray-400">Loading trip…</div>
  if (!trip) return <div className="p-8 text-danger-600">Trip not found</div>

  const rounds = (trip.rounds ?? []) as Round[]
  const selected = rounds.find((r) => r.id === selectedRoundId) ?? null

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
        <Link to="/trips" className="hover:text-gray-950 transition-colors">Trips</Link>
        <ChevronRight size={12} className="text-gray-300" />
        <span className="text-gray-950">{trip.name}</span>
        <ChevronRight size={12} className="text-gray-300" />
        <span>Detail</span>
      </div>

      <header className="flex items-center gap-4 mb-8">
        <Link
          to="/trips"
          className="p-2 -ml-2 text-gray-400 hover:text-gray-950 hover:bg-white rounded-full transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-950">{trip.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={trip.status as BadgeVariant} label={trip.status} />
            <span className="text-xs text-gray-400 font-medium">
              • {new Date(trip.startDate).toLocaleDateString()} —{' '}
              {new Date(trip.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Left column: trip info */}
        <div className="w-[240px] space-y-6 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Quick Actions
            </p>
            <div className="flex flex-col gap-2">
              <Link to={`/trips/${tripId}/passengers`}>
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
                  <Users size={14} /> Manage Passengers
                </Button>
              </Link>
              <Link to={`/trips/${tripId}/dashboard`}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-9 text-xs text-success-600 hover:text-success-600 hover:bg-success-50"
                >
                  <Activity size={14} /> Live Dashboard
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
                <Share2 size={14} /> Share Link
              </Button>
            </div>

            {trip.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Trip Note
                </p>
                <p className="text-xs text-gray-600 leading-relaxed italic">
                  &ldquo;{trip.description}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center column: rounds timeline */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-950">Journey Rounds</h2>
          </div>

          {rounds.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center text-gray-400 text-sm">
              No rounds yet for this trip.
            </div>
          ) : (
            <div className="relative pl-10 space-y-12 pb-20">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              {rounds.map((round, idx) => (
                <div key={round.id} className="relative">
                  <div
                    className={cn(
                      'absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-gray-50 z-10 transition-all',
                      round.status === RoundStatus.DONE && 'bg-success-600 text-white',
                      round.status === RoundStatus.IN_PROGRESS &&
                        'bg-warning-500 scale-110 shadow-lg shadow-warning-500/20 text-white',
                      round.status === RoundStatus.CANCELLED && 'bg-danger-600 text-white',
                      round.status === RoundStatus.PLANNED && 'bg-gray-200 text-gray-500',
                    )}
                  >
                    <span className="text-[10px] font-bold">{round.sequence ?? idx + 1}</span>
                  </div>

                  <motion.div
                    whileHover={{ x: 4 }}
                    onClick={() =>
                      setSelectedRoundId(round.id === selectedRoundId ? null : round.id)
                    }
                    className={cn(
                      'p-5 rounded-2xl cursor-pointer transition-all border-2',
                      selectedRoundId === round.id
                        ? 'bg-white shadow-xl border-primary-600 translate-x-2'
                        : 'bg-white/60 border-transparent hover:bg-white hover:shadow-md',
                    )}
                  >
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-950 truncate">
                          Round {round.sequence}: {round.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <MapPin size={12} strokeWidth={3} />
                          <span className="truncate">
                            {round.departurePoint} → {round.arrivalPoint}
                          </span>
                        </div>
                      </div>
                      <Badge variant={round.status as BadgeVariant} label={round.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <Clock size={12} />
                        {new Date(round.scheduledDep).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        —{' '}
                        {new Date(round.scheduledArr).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: allocation panel — animated */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              layoutId="roundPanel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-[420px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-min sticky top-8 shrink-0"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-gray-950">Bus Allocation</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {selected.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRoundId(null)}
                  className="text-gray-400 hover:text-gray-950"
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              </div>

              <AllocationPanel tripId={tripId!} round={selected} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  const [overrideAttendance] = useOverrideAttendanceMutation()
  const isAdmin = useAppSelector((s) => s.auth.role) === 'ADMIN'

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
    const res = await allocate({
      tripId,
      roundId,
      busId: targetBusId,
      passengerIds: selectedPassengers,
    }).unwrap()
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

  if (isLoading) {
    return <div className="p-5 text-gray-400 text-sm">Loading allocations…</div>
  }

  return (
    <div className="flex flex-col">
      <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
        {warning && (
          <div className="p-3 bg-danger-50 rounded-xl border border-danger-100 flex items-start gap-3">
            <AlertCircle className="text-danger-600 shrink-0 mt-0.5" size={16} />
            <div className="flex-1">
              <p className="text-[11px] text-danger-600 leading-tight">{warning}</p>
              <button
                onClick={() => setWarning(null)}
                className="text-[10px] text-danger-600 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isPlanned && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Assign Unallocated
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 h-9 px-3 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                placeholder="Target Bus ID"
                value={targetBusId}
                onChange={(e) => setTargetBusId(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleAllocate}
                disabled={allocating || !selectedPassengers.length || !targetBusId}
              >
                <BusIcon size={13} className="mr-1.5" />
                Assign {selectedPassengers.length ? `(${selectedPassengers.length})` : ''}
              </Button>
            </div>
            {unallocated.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 bg-gray-50/50 rounded-xl p-2">
                {unallocated.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPassengers.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedPassengers([...selectedPassengers, p.id])
                        else
                          setSelectedPassengers(
                            selectedPassengers.filter((id) => id !== p.id),
                          )
                      }}
                    />
                    <span className="font-bold text-gray-950 truncate flex-1">{p.name}</span>
                    {p.type && (
                      <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {Object.keys(byBus).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No passengers allocated yet.</p>
        ) : (
          Object.entries(byBus).map(([bid, busAllocs]) => (
            <div key={bid} className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {busAllocs[0]?.roundBusAssignment?.bus?.name ?? `Bus`}
                  </p>
                  <h4 className="text-sm font-bold text-gray-950">
                    {busAllocs[0]?.roundBusAssignment?.bus?.licensePlate ?? bid.slice(0, 8)}
                  </h4>
                </div>
                <p className="text-sm font-bold text-gray-950">
                  {busAllocs.length}
                  <span className="text-gray-400"> pax</span>
                </p>
              </div>

              <div className="space-y-1">
                {busAllocs.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-950 truncate">
                        {a.tripPassengerAssignment.name}
                      </p>
                      {a.tripPassengerAssignment.type && (
                        <Badge
                          variant={`TYPE_${a.tripPassengerAssignment.type}` as BadgeVariant}
                          label={a.tripPassengerAssignment.type}
                        />
                      )}
                    </div>
                    {a.attendanceRecord ? (
                      <Badge
                        variant={a.attendanceRecord.status as BadgeVariant}
                        label={a.attendanceRecord.status}
                      />
                    ) : (
                      <Badge variant="PLANNED" label="PENDING" />
                    )}
                    {isAdmin &&
                      a.attendanceRecord &&
                      a.attendanceRecord.status !== 'CANCELLED' && (
                        <button
                          onClick={() =>
                            overrideAttendance({
                              tripId,
                              roundId,
                              recordId: a.attendanceRecord!.id,
                              status:
                                a.attendanceRecord!.status === 'JOIN' ? 'ABSENT' : 'JOIN',
                            })
                          }
                          className="text-[10px] font-bold text-primary-600 hover:underline ml-2"
                        >
                          Override
                        </button>
                      )}
                    {isPlanned && (
                      <div className="ml-2 flex items-center gap-1">
                        {movingId === a.id ? (
                          <>
                            <input
                              className="h-7 w-28 border border-gray-200 rounded px-2 text-[10px]"
                              placeholder="New Bus ID"
                              value={moveToBusId}
                              onChange={(e) => setMoveToBusId(e.target.value)}
                            />
                            <button
                              onClick={() => handleMove(a.id)}
                              className="text-[10px] font-bold text-success-600 hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setMovingId(null)}
                              className="text-[10px] text-gray-400 hover:underline"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setMovingId(a.id)}
                              className="text-[10px] font-bold text-gray-500 hover:text-primary-600"
                            >
                              Move
                            </button>
                            <button
                              onClick={() =>
                                removeAllocation({ tripId, roundId, assignmentId: a.id })
                              }
                              className="text-[10px] font-bold text-gray-400 hover:text-danger-600"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-5 border-t border-gray-100">
        <NotificationPanel tripId={tripId} roundId={roundId} />
      </div>
    </div>
  )
}
