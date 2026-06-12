import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetTripsQuery,
  useCreateTripMutation,
  useDeleteTripMutation,
} from './tripsApi'
import { getTripHighlight, type TripHighlight } from './tripUtils'
import { TripStatus } from '@pms/shared'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { MetricCard } from '../../components/ui/metric-card'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { EmptyState } from '../../components/ui/empty-state'
import { PageHeader } from '../../components/ui/page-header'
import { TabTransition } from '../../components/ui/tab-transition'
import { Skeleton } from '../../components/ui/skeleton'
import {
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Activity,
  Clock,
  CheckCircle2,
  X,
  Zap,
  Inbox,
  ArrowRight,
  AlertCircle,
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
  // Trip.status được SUY RA (R7); danh sách lọc theo trạng thái mà API trả về.
  // URL là nguồn dữ liệu duy nhất cho bộ lọc đang áp dụng (?status=IN_PROGRESS|PLANNED|DONE).
  const tabToStatus: Record<Tab, string | null> = {
    all: null,
    active: 'IN_PROGRESS',
    upcoming: 'PLANNED',
    done: 'DONE',
  }
  const statusToTab = (s: string | null): Tab =>
    s === 'IN_PROGRESS' ? 'active' : s === 'PLANNED' ? 'upcoming' : s === 'DONE' ? 'done' : 'all'
  const activeTab = statusToTab(searchParams.get('status'))

  function handleTabChange(tab: Tab) {
    const status = tabToStatus[tab]
    setSearchParams(status ? { status } : {})
  }
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const deletingTrip = trips.find((t) => t.id === deletingTripId) ?? null
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const stats = useMemo(() => {
    const active = trips.filter((t) => t.status === TripStatus.IN_PROGRESS).length
    const upcoming = trips.filter((t) => t.status === TripStatus.PLANNED).length
    const completed = trips.filter((t) => t.status === TripStatus.DONE).length
    // finished chỉ phục vụ hiển thị số đếm trên tab "Done" (gồm cả CANCELLED)
    const finished = trips.filter(
      (t) => t.status === TripStatus.DONE || t.status === TripStatus.CANCELLED,
    ).length
    return { total: trips.length, active, upcoming, completed, finished }
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

  async function handleDeleteTrip() {
    if (!deletingTrip) return
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteTrip(deletingTrip.id).unwrap()
      setDeletingTripId(null)
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setDeleteError(typeof message === 'string' ? message : t('trips.failedDelete'))
    } finally {
      setDeleting(false)
    }
  }

  // Khung xương shimmer khớp bố cục thật để tránh giật layout khi dữ liệu về
  if (isLoading) {
    return (
      <div className="p-8" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="mb-8 space-y-3">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-11 w-[26rem] max-w-full rounded-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const tabLabels: Record<Tab, string> = {
    all: t('trips.tabAll'),
    active: t('trips.tabActive'),
    upcoming: t('trips.tabUpcoming'),
    done: t('trips.tabDone'),
  }
  // Số đếm hiển thị trên từng tab — chỉ là dữ liệu trình bày, suy ra từ stats
  const tabCounts: Record<Tab, number> = {
    all: stats.total,
    active: stats.active,
    upcoming: stats.upcoming,
    done: stats.finished,
  }

  return (
    <div className="p-8">
      <PageHeader
        className="mb-8"
        title={t('trips.title')}
        subtitle={
          trips.length === 0
            ? t('trips.noTripsHeader')
            : t('trips.subtitle', { count: trips.length })
        }
        actions={
          <Button className="gap-2 px-6 shadow-glow" size="lg" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            {t('trips.newTrip')}
          </Button>
        }
      />

      {/* Hàng thống kê — màu khớp quy tắc miền: đang chạy xanh lá, sắp tới hổ phách */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6 mb-10">
        <MetricCard
          label={t('trips.totalTrips')}
          value={stats.total}
          icon={MapPin}
          color="text-primary-600"
          bg="bg-primary-50"
          onClick={() => handleTabChange('all')}
        />
        <MetricCard
          label={t('trips.activeNow')}
          value={stats.active}
          icon={Activity}
          color="text-success-600"
          bg="bg-success-50"
          onClick={() => handleTabChange('active')}
        />
        <MetricCard
          label={t('trips.upcoming')}
          value={stats.upcoming}
          icon={Clock}
          color="text-warning-600"
          bg="bg-warning-50"
          onClick={() => handleTabChange('upcoming')}
        />
        <MetricCard
          label={t('trips.completed')}
          value={stats.completed}
          icon={CheckCircle2}
          color="text-navy-700"
          bg="bg-navy-50"
          onClick={() => handleTabChange('done')}
        />
      </div>

      {/* Tab lọc — segmented control với viên thuốc trắng trượt bằng layoutId */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div
          className="inline-flex items-center gap-1 rounded-full bg-gray-100/90 p-1 ring-1 ring-gray-200/70 shadow-inner-highlight"
          role="group"
        >
          {(['all', 'active', 'upcoming', 'done'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                aria-pressed={isActive}
                className={cn(
                  'relative cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                  isActive ? 'text-navy-900' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="trips-tab"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-white shadow-card ring-1 ring-black/[0.04]"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {tabLabels[tab]}
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-colors duration-200',
                      isActive ? 'bg-primary-50 text-primary-700' : 'bg-gray-200/80 text-gray-600',
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Chấm "live" khi có chuyến đang chạy — realtime, không dùng emoji */}
        {stats.active > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-success-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success-500 animate-ping-soft" />
              <span className="relative h-2 w-2 rounded-full bg-success-500 animate-pulse-soft" />
            </span>
            {t('trips.activeNow')}
          </div>
        )}
      </div>

      {/* Lưới các thẻ chuyến đi */}
      <TabTransition tabKey={activeTab}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={trips.length === 0 ? t('trips.noTrips') : t('trips.noTripsFiltered')}
            action={
              trips.length === 0 ? (
                <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
                  <Plus size={15} />
                  {t('trips.newTrip')}
                </Button>
              ) : undefined
            }
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20">
            {filtered.map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                index={index}
                onClick={() => navigate(`/trips/${trip.id}`)}
                onDelete={() => setDeletingTripId(trip.id)}
              />
            ))}
          </div>
        )}
      </TabTransition>

      {/* Modal xác nhận xóa chuyến đi */}
      <ConfirmDialog
        open={!!deletingTrip}
        title={t('trips.deleteTrip')}
        description={
          deletingTrip ? (
            <>
              <span className="font-semibold">"{deletingTrip.name}"</span>{' '}
              {t('trips.deleteTripConfirm')}
            </>
          ) : null
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        error={deleteError || null}
        onConfirm={handleDeleteTrip}
        onCancel={() => {
          setDeletingTripId(null)
          setDeleteError('')
        }}
      />

      {/* Modal tạo chuyến đi — backdrop navy mờ + panel scale-in bằng spring */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-navy-950/45 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label={t('trips.createTripTitle')}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-float ring-1 ring-black/5 z-[70]"
            >
              <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                    <MapPin size={18} />
                  </div>
                  <h2 className="font-display text-xl font-bold text-navy-900 tracking-tight">
                    {t('trips.createTripTitle')}
                  </h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  aria-label={t('common.close')}
                  className="cursor-pointer rounded-full p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-navy-900"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {t('trips.tripName')} *
                  </label>
                  <Input
                    placeholder={t('trips.tripNamePlaceholder')}
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm({ ...form, name: val })
                      setNameError(val.length > 0 ? validateSimpleText(val) : '')
                    }}
                    required
                    className={cn(
                      'h-11 font-medium',
                      nameError &&
                        'border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500/20',
                    )}
                  />
                  {nameError ? (
                    <p className="ml-1 text-[11px] text-danger-600">{nameError}</p>
                  ) : (
                    <p className="ml-1 text-[11px] text-gray-500">{t('trips.tripNameHint')}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      {t('trips.startDate')} *
                    </label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                      className="h-11 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      {t('trips.endDate')} *
                    </label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      required
                      className="h-11 font-medium"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {formError && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600"
                    >
                      <AlertCircle size={15} className="shrink-0" />
                      {formError}
                    </motion.p>
                  )}
                </AnimatePresence>

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

interface TripCardProps {
  trip: {
    id: string
    name: string
    startDate: string | Date
    endDate: string | Date
    status: string
  }
  index: number
  onClick: () => void
  onDelete: () => void
}

/**
 * Cấu hình accent theo quy tắc highlight ngày của miền (KHÓA, không đổi logic):
 * sắp khởi hành ≤3 ngày → hổ phách, đang diễn ra hôm nay → xanh lá.
 * done/cancelled mờ dần; normal trung tính.
 */
const ACCENT: Record<
  TripHighlight,
  { bar: string; ring: string; wash: string; glow: string; dim: string }
> = {
  active: {
    bar: 'bg-gradient-to-b from-success-400 to-success-600',
    ring: 'ring-success-200/60',
    wash: 'from-success-50/70 via-white to-white',
    glow: 'group-hover:bg-success-100/60',
    dim: '',
  },
  approaching: {
    bar: 'bg-gradient-to-b from-warning-400 to-warning-500',
    ring: 'ring-warning-200/70',
    wash: 'from-warning-50/80 via-white to-white',
    glow: 'group-hover:bg-warning-100/60',
    dim: '',
  },
  normal: {
    bar: 'bg-gradient-to-b from-primary-200 to-primary-400',
    ring: 'ring-gray-100',
    wash: 'from-white via-white to-white',
    glow: 'group-hover:bg-primary-100/50',
    dim: '',
  },
  done: {
    bar: 'bg-gray-200',
    ring: 'ring-gray-100',
    wash: 'from-gray-50/60 via-white to-white',
    glow: 'group-hover:bg-gray-100/70',
    dim: 'opacity-80',
  },
  cancelled: {
    bar: 'bg-danger-200',
    ring: 'ring-danger-100/70',
    wash: 'from-danger-50/40 via-white to-white',
    glow: 'group-hover:bg-danger-50/80',
    dim: 'opacity-70',
  },
}

function TripCard({ trip, index, onClick, onDelete }: TripCardProps) {
  const { t } = useTranslation()
  const status = trip.status as TripStatus
  const highlight = getTripHighlight(trip.startDate, trip.endDate, status)
  const daysToStart = Math.ceil(
    (new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  const accent = ACCENT[highlight]
  const progressFilled =
    status === TripStatus.DONE ? 4 : status === TripStatus.IN_PROGRESS ? 2 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 26,
        delay: Math.min(index * 0.04, 0.4),
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl bg-white bg-gradient-to-br shadow-card ring-1',
        'transition-shadow duration-200 hover:shadow-card-hover',
        accent.ring,
        accent.wash,
        accent.dim,
      )}
    >
      {/* Thanh accent dọc bên trái — mã hóa quy tắc highlight ngày */}
      <div aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', accent.bar)} />

      {/* Đường sáng mảnh phía trên cho chuyến đang diễn ra */}
      {highlight === 'active' && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success-400/70 to-transparent"
        />
      )}

      {/* Vầng sáng góc trên khi hover — chỉ transform/opacity/màu, không đổi layout */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-transparent blur-2xl transition-colors duration-300',
          accent.glow,
        )}
      />

      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4 gap-3">
          <h3 className="text-lg font-bold text-navy-900 leading-tight flex-1 tracking-tight">
            {trip.name}
          </h3>
          {status === TripStatus.IN_PROGRESS ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success-700 ring-1 ring-inset ring-success-200/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-success-500 animate-ping-soft" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success-600 animate-pulse-soft" />
              </span>
              {t('trips.activeNow')}
            </div>
          ) : highlight === 'approaching' ? (
            <Badge variant="IN_PROGRESS" className="gap-1">
              <Zap size={11} />
              {t('trips.startingSoon', { count: daysToStart })}
            </Badge>
          ) : (
            <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-600 text-sm mb-5 font-medium">
          <Calendar size={14} className="text-gray-400" />
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            {new Date(trip.startDate).toLocaleDateString()}
            <ArrowRight size={12} className="text-gray-400" aria-hidden="true" />
            {new Date(trip.endDate).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) =>
              i <= progressFilled ? (
                // Đoạn đã hoàn thành — vẽ dần từ trái sang khi thẻ xuất hiện
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 + i * 0.06 }}
                  className="h-1.5 w-6 origin-left rounded-full bg-gradient-to-r from-success-500 to-success-600"
                />
              ) : (
                <div key={i} className="h-1.5 w-3 rounded-full bg-gray-200" />
              ),
            )}
            <span className="ml-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {t('trips.journeyProgress')}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="cursor-pointer rounded-lg p-1.5 text-danger-600 opacity-0 transition-[opacity,background-color] duration-200 hover:bg-danger-50 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={t('common.delete')}
            title={t('common.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
