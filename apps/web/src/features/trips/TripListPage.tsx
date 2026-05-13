import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  useGetTripsQuery,
  useCreateTripMutation,
  useDeleteTripMutation,
} from './tripsApi'
import { getTripHighlight } from './tripUtils'
import { TripStatus } from '@pms/shared'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import {
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Activity,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'

type Tab = 'all' | 'active' | 'upcoming' | 'done'

export default function TripListPage() {
  const navigate = useNavigate()
  const { data: trips = [], isLoading } = useGetTripsQuery()
  const [createTrip, { isLoading: creating }] = useCreateTripMutation()
  const [deleteTrip] = useDeleteTripMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const stats = useMemo(() => {
    const active = trips.filter((t) => t.status === TripStatus.IN_PROGRESS).length
    const upcoming = trips.filter((t) => t.status === TripStatus.PLANNED).length
    const completed = trips.filter((t) => t.status === TripStatus.DONE).length
    return { total: trips.length, active, upcoming, completed }
  }, [trips])

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return trips.filter((t) => t.status === TripStatus.IN_PROGRESS)
      case 'upcoming':
        return trips.filter((t) => t.status === TripStatus.PLANNED)
      case 'done':
        return trips.filter((t) => t.status === TripStatus.DONE || t.status === TripStatus.CANCELLED)
      default:
        return trips
    }
  }, [trips, activeTab])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (form.name.includes('/')) {
      setFormError('Trip name must not contain "/"')
      return
    }
    try {
      await createTrip(form).unwrap()
      setForm({ name: '', startDate: '', endDate: '' })
      setShowForm(false)
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setFormError(typeof message === 'string' ? message : 'Failed to create trip')
    }
  }

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading trips…</div>
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">My Trips</h1>
          <p className="text-gray-600 mt-1">
            {trips.length === 0 ? 'No trips yet — create your first.' : `${trips.length} scheduled journey package${trips.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button className="gap-2 px-6" size="lg" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          New Trip
        </Button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Trips" value={stats.total} icon={MapPin} color="text-primary-600" bg="bg-primary-50" />
        <StatCard label="Active Now" value={stats.active} icon={Activity} color="text-success-600" bg="bg-success-50" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} color="text-warning-500" bg="bg-warning-50" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-gray-400" bg="bg-gray-100" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        {(['all', 'active', 'upcoming', 'done'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-bold transition-all relative capitalize',
              activeTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="trips-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Trip cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {trips.length === 0 ? 'No trips yet. Create your first trip.' : 'No trips match this filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => navigate(`/trips/${trip.id}`)}
              onDelete={() => deleteTrip(trip.id)}
            />
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-gray-950/30 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 z-[70]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-950">Create New Trip</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-950 rounded-full hover:bg-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    Trip Name *
                  </label>
                  <input
                    placeholder='e.g. Hanoi to Sapa (no "/")'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      required
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={creating} className="flex-1">
                    {creating ? 'Creating…' : 'Create Trip'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-card">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bg)}>
        <Icon size={20} className={color} />
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-950">{value}</p>
    </div>
  )
}

interface TripCardProps {
  trip: {
    id: string
    name: string
    startDate: string | Date
    endDate: string | Date
    status: string
  }
  onClick: () => void
  onDelete: () => void
}

function TripCard({ trip, onClick, onDelete }: TripCardProps) {
  const status = trip.status as TripStatus
  const highlight = getTripHighlight(trip.startDate, trip.endDate, status)
  const daysToStart = Math.ceil(
    (new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  const config = (() => {
    if (status === TripStatus.IN_PROGRESS)
      return { border: 'border-l-4 border-success-600', bg: 'bg-success-50/30' }
    if (status === TripStatus.PLANNED)
      return { border: 'border-l-4 border-warning-500', bg: 'bg-warning-50/30' }
    return { border: 'border-l-4 border-gray-200', bg: 'bg-white' }
  })()

  const progressFilled = status === TripStatus.DONE ? 4 : status === TripStatus.IN_PROGRESS ? 2 : 0

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl bg-white shadow-card overflow-hidden relative group',
        config.border,
        highlight === 'approaching' && 'bg-warning-50/20',
      )}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="text-lg font-bold text-gray-950 leading-tight flex-1">{trip.name}</h3>
          {status === TripStatus.IN_PROGRESS ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-50 text-success-600 text-[10px] font-bold uppercase tracking-wider animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-success-600" />
              Active Now
            </div>
          ) : highlight === 'approaching' ? (
            <Badge
              variant="IN_PROGRESS"
              label={`⚡ Starts in ${daysToStart} day${daysToStart === 1 ? '' : 's'}`}
            />
          ) : (
            <Badge variant={status as BadgeVariant} label={status} />
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
          <Calendar size={14} />
          <span>
            {new Date(trip.startDate).toLocaleDateString()} — {new Date(trip.endDate).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full',
                  i <= progressFilled ? 'bg-success-600' : 'bg-gray-200',
                )}
              />
            ))}
            <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Journey Progress
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1.5 text-gray-300 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete trip"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
