import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
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
import NotificationHistory from '../notifications/NotificationHistory'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { SectionCard } from '../../components/ui/section-card'
import { EmptyState } from '../../components/ui/empty-state'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Users,
  Bus as BusIcon,
  MapPin,
  Clock,
  Calendar,
  Activity,
  AlertCircle,
  X,
  Plus,
  Route,
  History,
} from 'lucide-react'
import { RoundStatus, type Round } from '@pms/shared'
import type { BadgeVariant } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { validateSimpleText } from '../../lib/validators'

/* Nhãn mục nhỏ chữ hoa dùng chung trong trang — đảm bảo tương phản trên nền sáng */
const MICRO_LABEL = 'text-[10px] font-bold uppercase tracking-widest text-gray-500'

/**
 * Hộp thông báo lỗi/cảnh báo nhỏ trong panel phân bổ — trượt vào nhẹ nhàng,
 * có nút bỏ qua. Chỉ phục vụ trình bày; handler bỏ qua được truyền từ ngoài vào.
 */
function InlineNote({
  tone,
  message,
  dismissLabel,
  onDismiss,
}: {
  tone: 'danger' | 'warning'
  message: string
  dismissLabel: string
  onDismiss: () => void
}) {
  const isDanger = tone === 'danger'
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex gap-2 rounded-xl border p-3',
        isDanger ? 'border-danger-100 bg-danger-50' : 'border-warning-200 bg-warning-50',
      )}
    >
      <AlertCircle
        size={14}
        className={cn('mt-0.5 shrink-0', isDanger ? 'text-danger-600' : 'text-warning-600')}
      />
      <div className="flex-1">
        <p
          className={cn(
            'text-[11px] font-medium leading-relaxed',
            isDanger ? 'text-danger-600' : 'text-warning-600',
          )}
        >
          {message}
        </p>
        <button
          onClick={onDismiss}
          className={cn(
            'mt-0.5 cursor-pointer text-[10px] font-bold underline underline-offset-2 transition-colors duration-150',
            isDanger ? 'text-danger-600 hover:text-danger-500' : 'text-warning-600 hover:text-warning-500',
          )}
        >
          {dismissLabel}
        </button>
      </div>
    </motion.div>
  )
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { t } = useTranslation()
  const { data: trip, isLoading } = useGetTripQuery(tripId!)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [showAddRound, setShowAddRound] = useState(false)
  const [createRound] = useCreateRoundMutation()
  const [updateRoundStatus] = useUpdateRoundStatusMutation()

  // Khung xương shimmer khớp bố cục thật — tránh giật layout khi dữ liệu về
  if (isLoading)
    return (
      <div className="p-8" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="mb-5 h-4 w-64" />
        <Skeleton className="mb-2 h-10 w-96 max-w-full rounded-xl" />
        <Skeleton className="mb-10 h-4 w-72" />
        <div className="flex gap-8">
          <Skeleton className="h-80 w-[250px] shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-9 w-56 rounded-xl" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )

  if (!trip)
    return (
      <div className="p-8">
        <EmptyState
          icon={AlertCircle}
          title={<span className="text-danger-600">{t('errors.tripNotFound')}</span>}
          className="py-24"
        />
      </div>
    )

  const rounds = (trip.rounds ?? []) as Round[]
  const selected = rounds.find((r) => r.id === selectedRoundId) ?? null

  // Số liệu trình bày suy ra từ danh sách round — không đụng vào logic miền
  const doneRounds = rounds.filter((r) => r.status === RoundStatus.DONE).length
  const liveRounds = rounds.filter((r) => r.status === RoundStatus.IN_PROGRESS).length
  const progressPct = rounds.length > 0 ? Math.round((doneRounds / rounds.length) * 100) : 0

  return (
    <div className="p-8">
      {/* Hero: breadcrumb + tiêu đề gradient (PageHeader tự animate) + badge trạng thái và khoảng ngày */}
      <PageHeader
        className="mb-10"
        title={trip.name}
        leading={
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
            <Link
              to="/trips"
              aria-label={t('common.back')}
              className="-ml-2 mr-1 cursor-pointer rounded-full p-2 text-gray-400 transition-colors duration-150 hover:bg-white hover:text-navy-900 hover:shadow-sm"
            >
              <ArrowLeft size={16} />
            </Link>
            <Link to="/trips" className="transition-colors duration-150 hover:text-primary-600">
              {t('nav.trips')}
            </Link>
            <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
            <span className="max-w-56 truncate normal-case text-navy-900">{trip.name}</span>
            <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
            <span>{t('trips.detail')}</span>
          </div>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Badge variant={trip.status as BadgeVariant} label={t(`status.${trip.status}`)} />
            <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-gray-600">
              <Calendar size={14} className="text-gray-400" aria-hidden="true" />
              {new Date(trip.startDate).toLocaleDateString()}
              <ArrowRight size={12} className="text-gray-400" aria-hidden="true" />
              {new Date(trip.endDate).toLocaleDateString()}
            </span>
            {/* Chấm "live" khi có round đang chạy — realtime, không dùng emoji */}
            {liveRounds > 0 && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-success-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-success-500 animate-ping-soft" />
                  <span className="relative h-2 w-2 rounded-full bg-success-500 animate-pulse-soft" />
                </span>
                {t('trips.activeNow')}
              </span>
            )}
          </span>
        }
      />

      <div className="flex flex-1 gap-8 min-h-0">
        {/* Cột trái: hành động nhanh + tiến độ hành trình + ghi chú chuyến đi */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
          className="w-[250px] shrink-0 space-y-6"
        >
          <SectionCard title={t('trips.quickActions')} bodyClassName="p-5">
            <div className="flex flex-col gap-2">
              <Link to={`/trips/${tripId}/passengers`} className="block">
                <Button variant="outline" className="group h-10 w-full justify-start gap-2.5 text-xs">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Users size={13} />
                  </span>
                  {t('trips.managePassengers')}
                  <ChevronRight
                    size={13}
                    className="ml-auto -translate-x-1 text-gray-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
              <Link to={`/trips/${tripId}/dashboard`} className="block">
                <Button
                  variant="outline"
                  className="group h-10 w-full justify-start gap-2.5 text-xs text-success-600 hover:border-success-200 hover:bg-success-50 hover:text-success-600"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600">
                    <Activity size={13} />
                  </span>
                  {t('trips.liveDashboard')}
                  <ChevronRight
                    size={13}
                    className="ml-auto -translate-x-1 text-success-200 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
            </div>

            {/* Tiến độ hành trình — số liệu trình bày suy ra từ trạng thái các round */}
            {rounds.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className={cn(MICRO_LABEL, 'mb-2.5')}>{t('trips.journeyProgress')}</p>
                <div className="mb-2.5 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold tabular-nums text-navy-900">
                    {doneRounds}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-gray-500">
                    / {rounds.length}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                  />
                </div>
              </div>
            )}

            {trip.description && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className={cn(MICRO_LABEL, 'mb-2.5')}>{t('trips.tripNote')}</p>
                <p className="rounded-xl bg-gray-50 p-3 text-xs italic leading-relaxed text-gray-600 ring-1 ring-gray-100">
                  &ldquo;{trip.description}&rdquo;
                </p>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Cột giữa: dòng thời gian các round */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                <Route size={16} />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-navy-900">
                {t('rounds.title')}
              </h2>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setShowAddRound(true)}>
              <Plus size={14} /> {t('rounds.addRound')}
            </Button>
          </div>

          {rounds.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
              <EmptyState
                icon={MapPin}
                title={t('rounds.noRounds')}
                action={
                  <Button size="sm" className="gap-2" onClick={() => setShowAddRound(true)}>
                    <Plus size={14} /> {t('rounds.addRound')}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="relative space-y-10 pb-20 pl-12">
              {/* Trục thời gian dọc — gradient nhạt dần về cuối hành trình */}
              <div
                aria-hidden="true"
                className="absolute bottom-2 left-4 top-2 w-px bg-gradient-to-b from-primary-300 via-gray-200 to-gray-200"
              />
              {rounds.map((round, idx) => {
                const isSelected = selectedRoundId === round.id
                return (
                  <motion.div
                    key={round.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                      delay: Math.min(idx * 0.05, 0.4),
                    }}
                    className="relative"
                  >
                    {/* Chấm trạng thái trên trục — màu giữ nguyên quy tắc miền */}
                    <div
                      className={cn(
                        'absolute -left-12 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-200',
                        round.status === RoundStatus.DONE &&
                          'bg-gradient-to-b from-success-500 to-success-600 text-white',
                        round.status === RoundStatus.IN_PROGRESS &&
                          'scale-110 bg-gradient-to-b from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/30',
                        round.status === RoundStatus.CANCELLED &&
                          'bg-gradient-to-b from-danger-500 to-danger-600 text-white',
                        round.status === RoundStatus.PLANNED && 'bg-gray-200 text-gray-600',
                      )}
                    >
                      {/* Quầng lan tỏa cho round đang chạy */}
                      {round.status === RoundStatus.IN_PROGRESS && (
                        <span
                          aria-hidden="true"
                          className="absolute -inset-1 rounded-full bg-warning-500/40 animate-ping-soft"
                        />
                      )}
                      <span className="relative text-[10px] font-bold">
                        {round.sequence ?? idx + 1}
                      </span>
                    </div>

                    <motion.div
                      animate={{ x: isSelected ? 6 : 0 }}
                      whileHover={{ x: 6 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      onClick={() =>
                        setSelectedRoundId(round.id === selectedRoundId ? null : round.id)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRoundId(round.id === selectedRoundId ? null : round.id)
                        }
                      }}
                      className={cn(
                        'cursor-pointer rounded-2xl p-5 ring-1 transition-[background-color,box-shadow] duration-200',
                        isSelected
                          ? 'bg-white shadow-card-hover ring-2 ring-primary-500/60'
                          : 'bg-white/70 ring-gray-200/60 hover:bg-white hover:shadow-card',
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-bold tracking-tight text-navy-900">
                            {round.sequence}. {round.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <MapPin size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
                            <span className="truncate">
                              {round.departurePoint} → {round.arrivalPoint}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={round.status as BadgeVariant}
                          label={t(`status.${round.status}`)}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-gray-500">
                          <Clock size={12} className="text-gray-400" aria-hidden="true" />
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

                      {/* Hàng hành động trạng thái — mở/đóng mượt theo lựa chọn */}
                      <AnimatePresence initial={false}>
                        {selectedRoundId === round.id && (
                          <motion.div
                            key="round-actions"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
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
                                  className="h-9 flex-1 cursor-pointer rounded-xl bg-gradient-to-b from-warning-500 to-warning-600 text-xs font-bold text-white shadow-sm shadow-warning-500/30 transition-[filter,box-shadow,transform] duration-200 hover:brightness-105 hover:shadow-md active:scale-[0.97]"
                                >
                                  {t('rounds.startRound')}
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
                                  className="h-9 flex-1 cursor-pointer rounded-xl bg-gradient-to-b from-success-500 to-success-600 text-xs font-bold text-white shadow-sm shadow-success-500/30 transition-[filter,box-shadow,transform] duration-200 hover:brightness-105 hover:shadow-md active:scale-[0.97]"
                                >
                                  {t('rounds.completeRound')}
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
                                  className="h-9 cursor-pointer rounded-xl border border-danger-100 px-4 text-xs font-bold text-danger-600 transition-colors duration-200 hover:bg-danger-50"
                                >
                                  {t('rounds.cancelRound')}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cột phải: panel phân bổ xe/hành khách cho round đang chọn */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              layoutId="roundPanel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="sticky top-8 flex h-min w-[420px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-card-hover ring-1 ring-gray-100"
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-primary-50/70 via-white to-white p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                    <BusIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-display font-bold tracking-tight text-navy-900">
                      {t('rounds.busAllocation')}
                    </h3>
                    <p className={cn(MICRO_LABEL, 'truncate')}>{selected.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoundId(null)}
                  className="shrink-0 cursor-pointer rounded-full p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-navy-900"
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

      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
            <History size={16} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-navy-900">
            {t('notifications.historyTitle')}
          </h2>
        </div>
        <NotificationHistory tripId={tripId!} />
      </div>

      {/* Modal thêm round — backdrop navy mờ + panel scale-in bằng spring */}
      <AnimatePresence>
        {showAddRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/45 p-6 backdrop-blur-sm"
            onClick={() => setShowAddRound(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label={t('rounds.addRoundTitle')}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                    <Route size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-tight text-navy-900">
                      {t('rounds.addRoundTitle')}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">{t('rounds.addRoundSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddRound(false)}
                  className="cursor-pointer rounded-full p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-navy-900"
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
  const { t } = useTranslation()
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
      setError(typeof msg === 'string' ? msg : t('rounds.failedCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  /* Lớp lỗi cho Input nền tảng — viền đỏ + ring đỏ mềm khi trường không hợp lệ */
  const errorFieldClass =
    'border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500/20'
  const labelClass = 'ml-1 text-[11px] font-bold uppercase tracking-wider text-gray-600'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.roundName')} *</label>
          <Input
            required
            placeholder={t('rounds.roundNamePlaceholder')}
            value={form.name}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, name: val })
              validateField('name', val)
            }}
            className={cn('h-11 font-medium', errors.name && errorFieldClass)}
          />
          {errors.name && <p className="ml-1 text-[11px] text-danger-600">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.sequence')} *</label>
          <Input
            type="number"
            min={1}
            required
            value={form.sequence}
            onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })}
            className="h-11 font-medium tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.departurePoint')} *</label>
          <Input
            required
            placeholder={t('rounds.departurePlaceholder')}
            value={form.departurePoint}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, departurePoint: val })
              validateField('departurePoint', val)
            }}
            className={cn('h-11 font-medium', errors.departurePoint && errorFieldClass)}
          />
          {errors.departurePoint && (
            <p className="ml-1 text-[11px] text-danger-600">{errors.departurePoint}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.arrivalPoint')} *</label>
          <Input
            required
            placeholder={t('rounds.arrivalPlaceholder')}
            value={form.arrivalPoint}
            onChange={(e) => {
              const val = e.target.value
              setForm({ ...form, arrivalPoint: val })
              validateField('arrivalPoint', val)
            }}
            className={cn('h-11 font-medium', errors.arrivalPoint && errorFieldClass)}
          />
          {errors.arrivalPoint && (
            <p className="ml-1 text-[11px] text-danger-600">{errors.arrivalPoint}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.scheduledDep')} *</label>
          <Input
            type="datetime-local"
            required
            value={form.scheduledDep}
            onChange={(e) => setForm({ ...form, scheduledDep: e.target.value })}
            className="h-11 font-medium tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>{t('rounds.scheduledArr')} *</label>
          <Input
            type="datetime-local"
            required
            value={form.scheduledArr}
            onChange={(e) => setForm({ ...form, scheduledArr: e.target.value })}
            className="h-11 font-medium tabular-nums"
          />
        </div>
      </div>

      {/* Lỗi từ API — trượt vào nhẹ để không gây giật */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 flex-1">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} className="h-11 flex-1">
          {submitting ? t('rounds.creating') : t('rounds.createRound')}
        </Button>
      </div>
    </form>
  )
}

function AllocationPanel({ tripId, round }: { tripId: string; round: Round }) {
  const { t } = useTranslation()
  const roundId = round.id
  const { data: passengers = [] } = useGetPassengersQuery(tripId)
  const { data: allocations = [], isLoading } = useGetAllocationsByRoundQuery({ tripId, roundId })
  const { data: roundBuses = [], refetch: refetchRoundBuses } = useGetRoundBusesQuery({
    tripId,
    roundId,
  })
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
  const [driverError, setDriverError] = useState<string | null>(null)
  const [busError, setBusError] = useState<string | null>(null)

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

  // R4: mỗi tài xế chỉ được quản lý tối đa một xe trong mỗi round. Ánh xạ tài xế đã gán -> xe để
  // dropdown có thể vô hiệu hóa tài xế đã được gán cho một xe khác trong round này.
  const driverBusMap = new Map<string, string>()
  for (const rb of roundBuses) {
    const uid = rb.busManagerAssignment?.userId
    if (uid) driverBusMap.set(uid, rb.busId)
  }
  const isDriverTaken = (driverId: string, currentBusId: string) => {
    const assignedBus = driverBusMap.get(driverId)
    return assignedBus != null && assignedBus !== currentBusId
  }

  async function handleAssignBus() {
    if (!addingBusId) return
    setBusError(null)
    try {
      await assignBus({ tripId, roundId, busId: addingBusId }).unwrap()
      setAddingBusId('')
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setBusError(typeof msg === 'string' ? msg : t('buses.failedAssign'))
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

  // Khung xương shimmer trong panel khi đang tải dữ liệu phân bổ
  if (isLoading)
    return (
      <div className="space-y-3 p-5" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )

  /* Lớp dùng chung cho select trong panel — đồng bộ với Input nền tảng */
  const selectClass =
    'h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-gray-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/25'

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {/* Mục 1: các xe trong round + gán tài xế */}
      <div className="space-y-3 p-5">
        <p className={MICRO_LABEL}>{t('buses.busesInRound')}</p>

        <AnimatePresence initial={false}>
          {driverError && (
            <InlineNote
              key="driver-error"
              tone="danger"
              message={driverError}
              dismissLabel={t('allocation.dismiss')}
              onDismiss={() => setDriverError(null)}
            />
          )}
        </AnimatePresence>

        {roundBuses.length === 0 && (
          <p className="text-xs text-gray-500">{t('buses.noBusesInRound')}</p>
        )}

        <div className="space-y-2">
          {roundBuses.map((rb) => {
            const busInfo = rb.bus
            const occupied = byBus[rb.busId]?.length ?? 0
            const fillPct =
              busInfo.capacity > 0
                ? Math.min(100, Math.round((occupied / busInfo.capacity) * 100))
                : 0
            const overCapacity = occupied > busInfo.capacity
            return (
              <div
                key={rb.busId}
                className="space-y-2.5 rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100 transition-colors duration-200 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm ring-1 ring-gray-100">
                      <BusIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy-900">{busInfo.name}</p>
                      <p className={cn(MICRO_LABEL, 'truncate')}>
                        {busInfo.licensePlate} ·{' '}
                        {t('buses.seats', { count: busInfo.capacity })}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 text-xs font-semibold tabular-nums',
                      overCapacity ? 'text-warning-600' : 'text-gray-600',
                    )}
                  >
                    {t('buses.pax', {
                      count: occupied,
                      capacity: busInfo.capacity,
                    })}
                  </p>
                </div>

                {/* Thanh lấp đầy chỗ ngồi — quá tải chuyển hổ phách (cảnh báo, không chặn — R9) */}
                <div className="h-1 overflow-hidden rounded-full bg-gray-200/70">
                  <motion.div
                    initial={false}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      overCapacity
                        ? 'bg-gradient-to-r from-warning-500 to-warning-600'
                        : 'bg-gradient-to-r from-primary-400 to-primary-600',
                    )}
                  />
                </div>

                {isAdmin && isPlanned && (
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(selectClass, 'h-9 text-xs')}
                      value={rb.busManagerAssignment?.userId ?? ''}
                      onChange={async (e) => {
                        if (!e.target.value) return
                        setDriverError(null)
                        try {
                          await assignDriver({
                            tripId,
                            roundId,
                            busId: rb.busId,
                            userId: e.target.value,
                          }).unwrap()
                        } catch (err: unknown) {
                          const status = (err as { status?: number }).status
                          if (status === 409) {
                            setDriverError(t('buses.driverAlreadyAssigned'))
                            refetchRoundBuses()
                          } else {
                            setDriverError(t('buses.failedAssignDriver'))
                          }
                        }
                      }}
                    >
                      <option value="" disabled>
                        {t('buses.assignDriver')}
                      </option>
                      {busManagers.map((bm) => {
                        const taken = isDriverTaken(bm.id, rb.busId)
                        return (
                          <option key={bm.id} value={bm.id} disabled={taken}>
                            {bm.name}
                            {taken ? ` — ${t('buses.alreadyAssignedShort')}` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <AnimatePresence initial={false}>
          {busError && (
            <InlineNote
              key="bus-error"
              tone="danger"
              message={busError}
              dismissLabel={t('allocation.dismiss')}
              onDismiss={() => setBusError(null)}
            />
          )}
        </AnimatePresence>

        {isAdmin && isPlanned && availableBuses.length > 0 && (
          <div className="flex gap-2">
            <select
              value={addingBusId}
              onChange={(e) => setAddingBusId(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                {t('buses.addBusToRound')}
              </option>
              {availableBuses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.licensePlate}
                </option>
              ))}
            </select>
            <Button size="sm" className="h-10" onClick={handleAssignBus} disabled={!addingBusId}>
              {t('common.add')}
            </Button>
          </div>
        )}
      </div>

      {/* Mục 2: gán hành khách lên xe (chỉ Admin + round PLANNED) */}
      {isAdmin && isPlanned && roundBuses.length > 0 && (
        <div className="space-y-3 p-5">
          <p className={MICRO_LABEL}>{t('allocation.assignPassengers')}</p>

          <AnimatePresence initial={false}>
            {warning && (
              <InlineNote
                key="capacity-warning"
                tone="warning"
                message={warning}
                dismissLabel={t('allocation.dismiss')}
                onDismiss={() => setWarning(null)}
              />
            )}
          </AnimatePresence>

          <select
            value={targetBusId}
            onChange={(e) => setTargetBusId(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              {t('allocation.targetBus')}
            </option>
            {roundBuses.map((rb) => (
              <option key={rb.busId} value={rb.busId}>
                {rb.bus.name} · {rb.bus.licensePlate}
              </option>
            ))}
          </select>

          {unallocated.length > 0 ? (
            <>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-gray-50/80 p-2 ring-1 ring-gray-100">
                {unallocated.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors duration-150 hover:bg-white hover:shadow-sm"
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
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-primary-600"
                    />
                    <span className="flex-1 truncate font-semibold text-navy-900">{p.name}</span>
                    {p.type && (
                      <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                    )}
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="h-9 w-full"
                onClick={handleAllocate}
                disabled={allocating || !selectedPassengers.length || !targetBusId}
              >
                <BusIcon size={13} className="mr-1.5" />
                {selectedPassengers.length
                  ? t('allocation.selectedCount', { count: selectedPassengers.length })
                  : t('allocation.assignButton')}
              </Button>
            </>
          ) : (
            <p className="py-2 text-center text-xs text-gray-500">
              {t('allocation.allAllocated')}
            </p>
          )}
        </div>
      )}

      {/* Mục 3: danh sách hành khách đã phân bổ theo từng xe */}
      <div className="max-h-[40vh] space-y-4 overflow-y-auto p-5">
        <p className={MICRO_LABEL}>{t('allocation.allocated')}</p>
        {Object.keys(byBus).length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-500">
            {t('allocation.noPassengersAllocated')}
          </p>
        ) : (
          Object.entries(byBus).map(([bid, busAllocs]) => (
            <div key={bid} className="space-y-1.5">
              <p className={cn(MICRO_LABEL, 'flex items-center gap-1.5')}>
                <BusIcon size={11} className="text-gray-400" aria-hidden="true" />
                {busAllocs[0]?.roundBusAssignment?.bus?.name ?? 'Bus'} ·{' '}
                {t('allocation.pax', { count: busAllocs.length })}
              </p>
              <div className="space-y-1">
                {busAllocs.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg p-2 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <span className="flex-1 truncate text-xs font-semibold text-navy-900">
                      {a.tripPassengerAssignment.name}
                    </span>
                    {a.attendanceRecord ? (
                      <Badge
                        variant={a.attendanceRecord.status as BadgeVariant}
                        label={t(`status.${a.attendanceRecord.status}`)}
                      />
                    ) : (
                      <Badge variant="PLANNED" label={t('status.PENDING')} />
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
                          className="ml-2 cursor-pointer text-[10px] font-bold text-primary-600 underline-offset-2 transition-colors duration-150 hover:text-primary-700 hover:underline"
                        >
                          {t('allocation.override')}
                        </button>
                      )}
                    {isPlanned && (
                      <button
                        onClick={() =>
                          removeAllocation({ tripId, roundId, assignmentId: a.id })
                        }
                        className="ml-1 cursor-pointer rounded-md p-1 text-danger-600 transition-colors duration-150 hover:bg-danger-50"
                        aria-label={t('common.delete')}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mục 4: panel gửi thông báo cho round đang chọn */}
      <div className="p-5">
        <NotificationPanel tripId={tripId} roundId={roundId} />
      </div>
    </div>
  )
}
