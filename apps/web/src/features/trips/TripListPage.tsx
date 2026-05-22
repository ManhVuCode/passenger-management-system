import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
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
import { validateSimpleText } from '../../lib/validators'

type Tab = 'all' | 'active' | 'upcoming' | 'done'

export default function TripListPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: trips = [], isLoading } = useGetTripsQuery()
  const [createTrip, { isLoading: creating }] = useCreateTripMutation()
  const [deleteTrip] = useDeleteTripMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [formError, setFormError] = useState('')
  const [nameError, setNameError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilter = searchParams.get('filter')
  const initialTab: Tab =
    urlFilter === 'active' || urlFilter === 'upcoming' || urlFilter === 'done'
      ? urlFilter
      : 'all'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    if (tab === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ filter: tab })
    }
  }
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const deletingTrip = trips.find((t) => t.id === deletingTripId) ?? null

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
        return trips.filter(
          (t) => t.status === TripStatus.DONE || t.status === TripStatus.CANCELLED,
        )
      default:
        return trips
    }
  }, [trips, activeTab])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const nameErr = validateSimpleText(form.name)
    if (nameErr) {
      setNameError(nameErr)
      return
    }
    if (form.name.includes('/')) {
      setFormError(t('errors.slashInName'))
      return
    }
    try {
      await createTrip(form).unwrap()
      setForm({ name: '', startDate: '', endDate: '' })
      setNameError('')
      setShowForm(false)
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setFormError(typeof message === 'string' ? message : t('trips.failedCreate'))
    }
  }

  if (isLoading) {
    return <div className="p-8 text-gray-400">{t('common.loading')}</div>
  }

  const tabLabels: Record<Tab, string> = {
    all: t('trips.tabAll'),
    active: t('trips.tabActive'),
    upcoming: t('trips.tabUpcoming'),
    done: t('trips.tabDone'),
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">
            {t('trips.title')}
          </h1>
          <p className="text-gray-600 mt-1.5">
            {trips.length === 0
              ? t('trips.noTripsHeader')
              : t('trips.subtitle', { count: trips.length })}
          </p>
        </div>
        <Button className="gap-2 px-6 shadow-glow" size="lg" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          {t('trips.newTrip')}
        </Button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard
          label={t('trips.totalTrips')}
          value={stats.total}
          icon={MapPin}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <StatCard
          label={t('trips.activeNow')}
          value={stats.active}
          icon={Activity}
          color="text-warning-500"
          bg="bg-warning-50"
        />
        <StatCard
          label={t('trips.upcoming')}
          value={stats.upcoming}
          icon={Clock}
          color="text-[#f59e0b]"
          bg="bg-[#fffbeb]"
        />
        <StatCard
          label={t('trips.completed')}
          value={stats.completed}
          icon={CheckCircle2}
          color="text-success-600"
          bg="bg-success-50"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        {(['all', 'active', 'upcoming', 'done'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              'px-4 py-2 text-sm font-bold transition-all relative',
              activeTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {tabLabels[tab]}
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
          {trips.length === 0 ? t('trips.noTrips') : t('trips.noTripsFiltered')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => navigate(`/trips/${trip.id}`)}
              onDelete={() => setDeletingTripId(trip.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Trip Confirm Modal */}
      <AnimatePresence>
        {deletingTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] z-[80] flex items-center justify-center p-6"
            onClick={() => setDeletingTripId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-danger-600" />
              </div>
              <h3 className="font-bold text-gray-950 mb-1">
                {t('trips.deleteTrip')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-semibold">"{deletingTrip.name}"</span>{' '}
                {t('trips.deleteTripConfirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingTripId(null)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    await deleteTrip(deletingTrip.id)
                    setDeletingTripId(null)
                  }}
                  className="flex-1 h-10 rounded-xl bg-danger-600 text-white text-sm font-medium hover:bg-danger-600/90 active:scale-[0.98] transition-all"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <h2 className="text-xl font-bold text-gray-950">{t('trips.createTripTitle')}</h2>
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
                    {t('trips.tripName')} *
                  </label>
                  <input
                    placeholder={t('trips.tripNamePlaceholder')}
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm({ ...form, name: val })
                      setNameError(val.length > 0 ? validateSimpleText(val) : '')
                    }}
                    required
                    className={cn(
                      'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium',
                      nameError && 'border-danger-600 focus:ring-danger-600/20',
                    )}
                  />
                  {nameError && (
                    <p className="text-[11px] text-danger-600 mt-1">{nameError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      {t('trips.startDate')} *
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
                      {t('trips.endDate')} *
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
                    {creating ? t('trips.creating') : t('trips.createTrip')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    {t('common.cancel')}
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
    <div className="bg-white p-5 rounded-2xl shadow-card ring-1 ring-gray-100 hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', bg)}>
        <Icon size={20} className={color} />
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-3xl font-extrabold text-navy-900 tracking-tight">{value}</p>
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
  const { t } = useTranslation()
  const status = trip.status as TripStatus
  const highlight = getTripHighlight(trip.startDate, trip.endDate, status)
  const daysToStart = Math.ceil(
    (new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  const config = (() => {
    if (status === TripStatus.IN_PROGRESS)
      return {
        border: 'border-l-[3px] border-success-600',
        ring: 'ring-1 ring-success-200/40',
        accent: 'from-success-50/60 via-white to-white',
      }
    if (status === TripStatus.PLANNED)
      return {
        border: 'border-l-[3px] border-warning-500',
        ring: 'ring-1 ring-warning-200/40',
        accent: 'from-warning-50/60 via-white to-white',
      }
    return {
      border: 'border-l-[3px] border-gray-200',
      ring: 'ring-1 ring-gray-100',
      accent: 'from-white via-white to-white',
    }
  })()

  const progressFilled =
    status === TripStatus.DONE ? 4 : status === TripStatus.IN_PROGRESS ? 2 : 0

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-2xl overflow-hidden relative group bg-gradient-to-br shadow-card hover:shadow-card-hover transition-shadow',
        config.border,
        config.ring,
        config.accent,
        highlight === 'approaching' && 'bg-warning-50/20',
      )}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4 gap-3">
          <h3 className="text-lg font-bold text-navy-900 leading-tight flex-1 tracking-tight">
            {trip.name}
          </h3>
          {status === TripStatus.IN_PROGRESS ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-success-500 opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success-600" />
              </span>
              {t('trips.activeNow')}
            </div>
          ) : highlight === 'approaching' ? (
            <Badge
              variant="IN_PROGRESS"
              label={t('trips.startingSoon', { count: daysToStart })}
            />
          ) : (
            <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-600 text-sm mb-5 font-medium">
          <Calendar size={14} className="text-gray-400" />
          <span>
            {new Date(trip.startDate).toLocaleDateString()} —{' '}
            {new Date(trip.endDate).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i <= progressFilled
                    ? 'w-6 bg-gradient-to-r from-success-500 to-success-600'
                    : 'w-3 bg-gray-200',
                )}
              />
            ))}
            <span className="ml-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('trips.journeyProgress')}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete trip"
            title={t('common.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
