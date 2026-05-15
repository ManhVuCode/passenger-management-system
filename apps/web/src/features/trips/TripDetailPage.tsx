import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  useGetTripQuery,
  useCreateRoundMutation,
  useUpdateRoundStatusMutation,
} from './tripsApi'
import { useGetPassengersQuery } from '../passengers/passengerApi'
import { useGetBusesQuery } from '../buses/busApi'
import { useGetBusManagersQuery } from '../users/usersApi'
import {
  useGetAllocationsByRoundQuery,
  useAllocatePassengersMutation,
  useRemoveAllocationMutation,
  useOverrideAttendanceMutation,
  useGetRoundBusesQuery,
  useAssignBusToRoundMutation,
  useAssignBusManagerMutation,
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
  Plus,
} from 'lucide-react'
import { RoundStatus, type Round } from '@pms/shared'
import type { BadgeVariant } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { validateSimpleText } from '../../lib/validators'

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { data: trip, isLoading } = useGetTripQuery(tripId!)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [showAddRound, setShowAddRound] = useState(false)
  const [createRound] = useCreateRoundMutation()
  const [updateRoundStatus] = useUpdateRoundStatusMutation()

  if (isLoading) return <div className="p-8 text-gray-400">Loading trip…</div>
  if (!trip) return <div className="p-8 text-danger-600">Trip not found</div>

  const rounds = (trip.rounds ?? []) as Round[]
  const selected = rounds.find((r) => r.id === selectedRoundId) ?? null

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
        <Link to="/trips" className="hover:text-gray-950 transition-colors">
          Trips
        </Link>
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
            <Button size="sm" className="gap-2" onClick={() => setShowAddRound(true)}>
              <Plus size={14} /> Add Round
            </Button>
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

                    {selectedRoundId === round.id && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        {round.status === RoundStatus.PLANNED && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateRoundStatus({
                                tripId: tripId!,
                                roundId: round.id,
                                status: 'IN_PROGRESS',
                              })
                            }}
                            className="flex-1 h-8 rounded-lg bg-warning-500 text-white text-xs font-bold hover:bg-warning-500/90 transition-colors"
                          >
                            ▶ Start Round
                          </button>
                        )}
                        {round.status === RoundStatus.IN_PROGRESS && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateRoundStatus({
                                tripId: tripId!,
                                roundId: round.id,
                                status: 'DONE',
                              })
                            }}
                            className="flex-1 h-8 rounded-lg bg-success-600 text-white text-xs font-bold hover:bg-success-600/90 transition-colors"
                          >
                            ✓ Complete Round
                          </button>
                        )}
                        {(round.status === RoundStatus.PLANNED ||
                          round.status === RoundStatus.IN_PROGRESS) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateRoundStatus({
                                tripId: tripId!,
                                roundId: round.id,
                                status: 'CANCELLED',
                              })
                            }}
                            className="h-8 px-3 rounded-lg border border-danger-100 text-danger-600 text-xs font-bold hover:bg-danger-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
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

      <AnimatePresence>
        {showAddRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] z-[80] flex items-center justify-center p-6"
            onClick={() => setShowAddRound(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-bold text-gray-950">Add Journey Round</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Define a leg of the trip</p>
                </div>
                <button
                  onClick={() => setShowAddRound(false)}
                  className="text-gray-400 hover:text-gray-950"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <AddRoundForm
                nextSequence={rounds.length + 1}
                onSubmit={async (data) => {
                  await createRound({ tripId: tripId!, body: data }).unwrap()
                  setShowAddRound(false)
                }}
                onCancel={() => setShowAddRound(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RoundFormValues {
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: string
  scheduledArr: string
}

function AddRoundForm({
  nextSequence,
  onSubmit,
  onCancel,
}: {
  nextSequence: number
  onSubmit: (data: RoundFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<RoundFormValues>({
    name: '',
    sequence: nextSequence,
    departurePoint: '',
    arrivalPoint: '',
    scheduledDep: '',
    scheduledArr: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateField(field: 'name' | 'departurePoint' | 'arrivalPoint', value: string) {
    const err = value.length > 0 ? validateSimpleText(value) : ''
    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const textFields = ['name', 'departurePoint', 'arrivalPoint'] as const
    const newErrors: Record<string, string> = {}
    for (const field of textFields) {
      const err = validateSimpleText(form[field])
      if (err) newErrors[field] = err
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : 'Failed to create round')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm font-medium'
  const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest'

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Round Name *</label>
          <input
            required
            placeholder="e.g. Leg 1 Hanoi - Sapa"
            value={form.name}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, name: val })
              validateField('name', val)
            }}
            className={cn(
              fieldClass,
              errors.name && 'border-danger-600 focus:ring-danger-600/20',
            )}
          />
          {errors.name && <p className="text-[11px] text-danger-600">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Sequence *</label>
          <input
            type="number"
            min={1}
            required
            value={form.sequence}
            onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Departure Point *</label>
          <input
            required
            placeholder="Nội Bài Airport"
            value={form.departurePoint}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, departurePoint: val })
              validateField('departurePoint', val)
            }}
            className={cn(
              fieldClass,
              errors.departurePoint && 'border-danger-600 focus:ring-danger-600/20',
            )}
          />
          {errors.departurePoint && (
            <p className="text-[11px] text-danger-600">{errors.departurePoint}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Arrival Point *</label>
          <input
            required
            placeholder="Sa Pa Town"
            value={form.arrivalPoint}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, arrivalPoint: val })
              validateField('arrivalPoint', val)
            }}
            className={cn(
              fieldClass,
              errors.arrivalPoint && 'border-danger-600 focus:ring-danger-600/20',
            )}
          />
          {errors.arrivalPoint && (
            <p className="text-[11px] text-danger-600">{errors.arrivalPoint}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Scheduled Departure *</label>
          <input
            type="datetime-local"
            required
            value={form.scheduledDep}
            onChange={(e) => setForm({ ...form, scheduledDep: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Scheduled Arrival *</label>
          <input
            type="datetime-local"
            required
            value={form.scheduledArr}
            onChange={(e) => setForm({ ...form, scheduledArr: e.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 h-11 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-600/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Round'}
        </button>
      </div>
    </form>
  )
}

function AllocationPanel({ tripId, round }: { tripId: string; round: Round }) {
  const roundId = round.id
  const { data: passengers = [] } = useGetPassengersQuery(tripId)
  const { data: allocations = [], isLoading } = useGetAllocationsByRoundQuery({ tripId, roundId })
  const { data: roundBuses = [] } = useGetRoundBusesQuery({ tripId, roundId })
  const { data: buses = [] } = useGetBusesQuery()
  const { data: busManagers = [] } = useGetBusManagersQuery()

  const [allocate, { isLoading: allocating }] = useAllocatePassengersMutation()
  const [removeAllocation] = useRemoveAllocationMutation()
  const [overrideAttendance] = useOverrideAttendanceMutation()
  const [assignBus] = useAssignBusToRoundMutation()
  const [assignDriver] = useAssignBusManagerMutation()

  const isAdmin = useAppSelector((s) => s.auth.role) === 'ADMIN'
  const isPlanned = round.status === RoundStatus.PLANNED

  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])
  const [targetBusId, setTargetBusId] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [addingBusId, setAddingBusId] = useState('')

  const assignedBusIds = new Set(roundBuses.map((rb) => rb.busId))
  const availableBuses = buses.filter((b) => !assignedBusIds.has(b.id))

  const allocatedIds = new Set(allocations.map((a) => a.tripPassengerAssignmentId))
  const unallocated = passengers.filter((p) => !allocatedIds.has(p.id))

  const byBus = allocations.reduce<Record<string, typeof allocations>>((acc, a) => {
    const bid = a.roundBusAssignment?.busId ?? a.busId
    if (!acc[bid]) acc[bid] = []
    acc[bid].push(a)
    return acc
  }, {})

  async function handleAssignBus() {
    if (!addingBusId) return
    try {
      await assignBus({ tripId, roundId, busId: addingBusId }).unwrap()
      setAddingBusId('')
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      alert(typeof msg === 'string' ? msg : 'Failed to assign bus')
    }
  }

  async function handleAllocate() {
    if (!selectedPassengers.length || !targetBusId) return
    const res = await allocate({
      tripId,
      roundId,
      busId: targetBusId,
      passengerIds: selectedPassengers,
    }).unwrap()
    setSelectedPassengers([])
    if (res.capacityWarning) setWarning(res.capacityWarning.message)
  }

  if (isLoading) return <div className="p-5 text-gray-400 text-sm">Loading…</div>

  const selectClass =
    'w-full h-10 px-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all'

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {/* ── Section 1: Buses in this round ── */}
      <div className="p-5 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Buses in this Round
        </p>

        {roundBuses.length === 0 && (
          <p className="text-xs text-gray-400">No buses assigned yet.</p>
        )}

        <div className="space-y-2">
          {roundBuses.map((rb) => {
            const busInfo = rb.bus
            return (
              <div key={rb.busId} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-950">{busInfo.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {busInfo.licensePlate} · {busInfo.capacity} seats
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {byBus[rb.busId]?.length ?? 0}/{busInfo.capacity} pax
                  </p>
                </div>

                {isAdmin && isPlanned && (
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(selectClass, 'h-9 text-xs')}
                      defaultValue=""
                      onChange={async (e) => {
                        if (!e.target.value) return
                        try {
                          await assignDriver({
                            tripId,
                            roundId,
                            busId: rb.busId,
                            userId: e.target.value,
                          }).unwrap()
                        } catch {
                          alert('Failed to assign driver')
                        }
                      }}
                    >
                      <option value="" disabled>
                        Assign driver…
                      </option>
                      {busManagers.map((bm) => (
                        <option key={bm.id} value={bm.id}>
                          {bm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {isAdmin && isPlanned && availableBuses.length > 0 && (
          <div className="flex gap-2">
            <select
              value={addingBusId}
              onChange={(e) => setAddingBusId(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Add a bus to this round…
              </option>
              {availableBuses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.licensePlate}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleAssignBus} disabled={!addingBusId}>
              Add
            </Button>
          </div>
        )}
      </div>

      {/* ── Section 2: Assign passengers ── */}
      {isAdmin && isPlanned && roundBuses.length > 0 && (
        <div className="p-5 space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Assign Passengers
          </p>

          {warning && (
            <div className="p-3 bg-warning-50 rounded-xl border border-warning-500/20 flex gap-2">
              <AlertCircle size={14} className="text-warning-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] text-warning-500">{warning}</p>
                <button
                  onClick={() => setWarning(null)}
                  className="text-[10px] text-warning-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <select
            value={targetBusId}
            onChange={(e) => setTargetBusId(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Select target bus…
            </option>
            {roundBuses.map((rb) => (
              <option key={rb.busId} value={rb.busId}>
                {rb.bus.name} · {rb.bus.licensePlate}
              </option>
            ))}
          </select>

          {unallocated.length > 0 ? (
            <>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-gray-50 rounded-xl p-2">
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
                          setSelectedPassengers(selectedPassengers.filter((id) => id !== p.id))
                      }}
                    />
                    <span className="font-bold text-gray-950 flex-1 truncate">{p.name}</span>
                    {p.type && (
                      <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                    )}
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleAllocate}
                disabled={allocating || !selectedPassengers.length || !targetBusId}
              >
                <BusIcon size={13} className="mr-1.5" />
                Assign {selectedPassengers.length ? `(${selectedPassengers.length})` : 'Selected'}
              </Button>
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">
              All passengers are allocated.
            </p>
          )}
        </div>
      )}

      {/* ── Section 3: Allocated passengers per bus ── */}
      <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Allocated Passengers
        </p>
        {Object.keys(byBus).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No passengers allocated yet.</p>
        ) : (
          Object.entries(byBus).map(([bid, busAllocs]) => (
            <div key={bid}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {busAllocs[0]?.roundBusAssignment?.bus?.name ?? 'Bus'} · {busAllocs.length} pax
              </p>
              <div className="space-y-1">
                {busAllocs.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-xs font-bold text-gray-950 truncate flex-1">
                      {a.tripPassengerAssignment.name}
                    </span>
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
                      <button
                        onClick={() =>
                          removeAllocation({ tripId, roundId, assignmentId: a.id })
                        }
                        className="text-[10px] text-danger-600 hover:underline ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-5">
        <NotificationPanel tripId={tripId} roundId={roundId} />
      </div>
    </div>
  )
}
