import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetTripQuery } from '../trips/tripsApi'
import {
  useGetAllocationsByRoundQuery,
  useMarkAttendanceMutation,
  type RoundPassengerAllocation,
} from '../allocation/allocationApi'
import {
  useAttendanceSocket,
  type AttendanceUpdate,
  type RoundStatusUpdate,
} from '../../hooks/useAttendanceSocket'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { EmptyState } from '../../components/ui/empty-state'
import { TabTransition } from '../../components/ui/tab-transition'
import {
  ArrowLeft,
  Bus as BusIcon,
  Check,
  X,
  Clock,
  Users,
  Ban,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { RoundStatus } from '@pms/shared'

/** Chấm LIVE: vòng ping lan toả + nhịp đập mềm — xám tĩnh khi mất kết nối */
function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {connected && (
        <span className="absolute inset-0 rounded-full bg-success-500 animate-ping-soft" />
      )}
      <span
        className={cn(
          'relative h-2 w-2 rounded-full',
          connected ? 'bg-success-500 animate-pulse-soft' : 'bg-gray-400',
        )}
      />
    </span>
  )
}

export default function LiveDashboardPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { t } = useTranslation()
  const { data: trip } = useGetTripQuery(tripId!)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)
  const [roundStatuses, setRoundStatuses] = useState<Record<string, string>>({})

  const rounds = trip?.rounds ?? []
  const activeRoundId = selectedRound ?? rounds[0]?.id ?? null

  // Danh sách phân bổ của round đang chọn (đã kèm attendanceRecord + thông tin xe).
  const { data: allocations = [], isLoading, refetch } = useGetAllocationsByRoundQuery(
    { tripId: tripId!, roundId: activeRoundId ?? '' },
    { skip: !activeRoundId },
  )

  const { isConnected } = useAttendanceSocket({
    tripId,
    // Tài xế (hoặc admin khác) điểm danh ở round đang xem → kéo lại danh sách cho khớp.
    onAttendanceUpdate: useCallback(
      (data: AttendanceUpdate) => {
        if (data.roundId === activeRoundId) refetch()
      },
      [activeRoundId, refetch],
    ),
    onRoundStatusUpdate: useCallback((data: RoundStatusUpdate) => {
      setRoundStatuses((prev) => ({ ...prev, [data.roundId]: data.status }))
    }, []),
  })

  const activeStatus = (activeRoundId
    ? roundStatuses[activeRoundId] ?? rounds.find((r) => r.id === activeRoundId)?.status
    : undefined) as RoundStatus | undefined
  // Domain rule #6: round đã CANCELLED là trạng thái cuối — không cho điểm danh.
  const canMark = activeStatus !== RoundStatus.CANCELLED

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Thanh trên cùng: breadcrumb + chip LIVE + pill chọn round ── */}
      <header className="glass relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200/70 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/trips/${tripId}`}
            aria-label={t('common.back')}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-navy-900"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                {t('nav.trips')}
              </span>
              <span className="text-gray-300">/</span>
              <span className="max-w-[300px] truncate font-display text-sm font-bold text-navy-900">
                {trip?.name ?? '…'} — {t('trips.liveDashboard')}
              </span>
            </div>
          </div>

          <span
            className={cn(
              'ml-1 inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-widest ring-1 ring-inset transition-colors duration-300',
              isConnected
                ? 'bg-success-50 text-success-600 ring-success-600/20'
                : 'bg-gray-100 text-gray-500 ring-gray-300/60',
            )}
          >
            <LiveDot connected={isConnected} />
            {isConnected ? t('attendance.connected') : t('attendance.connecting')}
          </span>
        </div>

        {rounds.length > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-gray-100/80 p-1 ring-1 ring-inset ring-gray-200/60">
            {rounds.slice(0, 5).map((round) => {
              const isActive = activeRoundId === round.id
              return (
                <button
                  key={round.id}
                  onClick={() => setSelectedRound(round.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'relative h-7 cursor-pointer rounded-lg px-3.5 text-xs font-bold transition-colors duration-200',
                    isActive ? 'text-white' : 'text-gray-500 hover:text-navy-900',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="live-round-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-sky-500 to-primary-600 shadow-md shadow-primary-600/25"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">#{round.sequence}</span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Rail trái: danh sách round ── */}
        <aside className="w-[264px] shrink-0 space-y-1.5 overflow-y-auto border-r border-gray-200/70 bg-white p-4">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
            {t('rounds.title')}
          </p>
          {rounds.length === 0 && (
            <p className="px-2 text-xs text-gray-600">{t('rounds.noRounds')}</p>
          )}
          {rounds.map((round, i) => {
            const isActive = activeRoundId === round.id
            const status = (roundStatuses[round.id] ?? round.status) as RoundStatus
            return (
              <motion.button
                key={round.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => setSelectedRound(round.id)}
                aria-pressed={isActive}
                className={cn(
                  'relative w-full cursor-pointer rounded-xl p-4 text-left transition-colors duration-200',
                  !isActive && 'hover:bg-gray-50',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="live-round-card"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-primary-50 shadow-sm ring-1 ring-inset ring-primary-200/70"
                    aria-hidden="true"
                  >
                    <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-gradient-to-b from-sky-400 to-primary-600" />
                  </motion.span>
                )}
                <div className="relative mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'truncate text-sm font-bold transition-colors duration-200',
                      isActive ? 'text-primary-700' : 'text-navy-900',
                    )}
                  >
                    Round {round.sequence}: {round.name}
                  </span>
                </div>
                <div className="relative flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'truncate text-xs transition-colors duration-200',
                      isActive ? 'text-primary-600/80' : 'text-gray-600',
                    )}
                  >
                    {round.departurePoint} → {round.arrivalPoint}
                  </p>
                  <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
                </div>
              </motion.button>
            )
          })}
        </aside>

        {/* ── Khu trung tâm: danh sách điểm danh, gộp theo xe ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeRoundId ? (
            <TabTransition tabKey={activeRoundId}>
              {!canMark && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-200">
                  <Ban size={14} />
                  {t('attendance.roundCancelledNotice')}
                </div>
              )}
              <RoundAttendance
                tripId={tripId!}
                roundId={activeRoundId}
                allocations={allocations}
                isLoading={isLoading}
                canMark={canMark}
              />
            </TabTransition>
          ) : (
            <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
              <EmptyState icon={Clock} title={t('rounds.noRounds')} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/** Khối nội dung: gom hành khách theo xe rồi render từng mục xe với list điểm danh. */
function RoundAttendance({
  tripId,
  roundId,
  allocations,
  isLoading,
  canMark,
}: {
  tripId: string
  roundId: string
  allocations: RoundPassengerAllocation[]
  isLoading: boolean
  canMark: boolean
}) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
        <EmptyState icon={Clock} title={t('common.loading')} />
      </div>
    )
  }

  const byBus = allocations.reduce<Record<string, RoundPassengerAllocation[]>>((acc, a) => {
    const bid = a.roundBusAssignment?.busId ?? a.busId
    if (!acc[bid]) acc[bid] = []
    acc[bid].push(a)
    return acc
  }, {})

  if (Object.keys(byBus).length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
        <EmptyState icon={Users} title={t('allocation.noPassengersAllocated')} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {Object.entries(byBus).map(([busId, rows], i) => (
        <BusSection
          key={busId}
          busId={busId}
          rows={rows}
          tripId={tripId}
          roundId={roundId}
          canMark={canMark}
          delay={Math.min(i * 0.05, 0.4)}
        />
      ))}
    </div>
  )
}

/** Một mục xe: header (xe + biển số + đếm) và list hành khách điểm danh kiểu tài xế. */
function BusSection({
  busId,
  rows,
  tripId,
  roundId,
  canMark,
  delay,
}: {
  busId: string
  rows: RoundPassengerAllocation[]
  tripId: string
  roundId: string
  canMark: boolean
  delay: number
}) {
  const busInfo = rows[0]?.roundBusAssignment?.bus
  const joined = rows.filter((r) => r.attendanceRecord?.status === 'JOIN').length
  const absent = rows.filter((r) => r.attendanceRecord?.status === 'ABSENT').length
  const pending = rows.length - joined - absent

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
      className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-100"
    >
      {/* Header xe */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shadow-inner-highlight ring-1 ring-black/[0.03]">
            <BusIcon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-navy-900">
              {busInfo?.name ?? `Bus ${busId.slice(0, 8)}`}
            </h3>
            <p className="truncate font-mono text-[10px] font-bold tracking-wide text-gray-400">
              {busInfo?.licensePlate ?? busId.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1 text-success-600">
            <Check size={13} /> {joined}
          </span>
          <span className="flex items-center gap-1 text-danger-600">
            <X size={13} /> {absent}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Clock size={13} /> {pending}
          </span>
        </div>
      </div>

      {/* List hành khách */}
      <div className="flex-1">
        {rows.map((a, idx) => (
          <MarkRow
            key={a.id}
            a={a}
            index={idx}
            tripId={tripId}
            roundId={roundId}
            canMark={canMark}
          />
        ))}
      </div>
    </motion.div>
  )
}

/** Một hàng điểm danh: số thứ tự, tên + SĐT, hai nút JOIN/ABSENT giống màn tài xế. */
function MarkRow({
  a,
  index,
  tripId,
  roundId,
  canMark,
}: {
  a: RoundPassengerAllocation
  index: number
  tripId: string
  roundId: string
  canMark: boolean
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [mark, { isLoading }] = useMarkAttendanceMutation()
  const status = a.attendanceRecord?.status
  const isJoined = status === 'JOIN'
  const isAbsent = status === 'ABSENT'

  // Flash nhẹ khi trạng thái đổi (do bấm hoặc realtime).
  const prev = useRef<string | undefined>(status)
  const [flashId, setFlashId] = useState(0)
  useEffect(() => {
    if (prev.current !== status) {
      prev.current = status
      if (!reduce) setFlashId((n) => n + 1)
    }
  }, [status, reduce])

  const busId = a.roundBusAssignment?.busId ?? a.busId
  function handleMark(next: 'JOIN' | 'ABSENT') {
    if (!canMark || isLoading) return
    mark({
      tripId,
      roundId,
      busId,
      roundPassengerAssignmentIds: [a.id],
      status: next,
    })
  }

  return (
    <div className="relative flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 last:border-0">
      <AnimatePresence>
        {flashId > 0 && (
          <motion.span
            key={flashId}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 bg-primary-100/70"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold',
          isJoined
            ? 'bg-success-100 text-success-700'
            : isAbsent
              ? 'bg-warning-100 text-[#92400e]'
              : 'bg-gray-100 text-gray-600',
        )}
      >
        {index + 1}
      </div>

      <div className="relative min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-navy-800">
          {a.tripPassengerAssignment.name}
        </h4>
        <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
          <span className="shrink-0">{a.tripPassengerAssignment.phone}</span>
          {a.tripPassengerAssignment.type && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {a.tripPassengerAssignment.type}
            </span>
          )}
        </p>
      </div>

      <div className="relative flex shrink-0 items-center gap-2">
        <button
          onClick={() => handleMark('JOIN')}
          disabled={!canMark || isLoading}
          aria-pressed={isJoined}
          aria-label={t('attendance.join')}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
            isJoined
              ? 'border-success-600 bg-gradient-to-b from-success-500 to-success-600 text-white'
              : 'border-gray-200 bg-white text-gray-400 hover:border-success-500/60 hover:text-success-600',
          )}
        >
          <Check size={22} strokeWidth={3} />
        </button>
        <button
          onClick={() => handleMark('ABSENT')}
          disabled={!canMark || isLoading}
          aria-pressed={isAbsent}
          aria-label={t('attendance.absent')}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
            isAbsent
              ? 'border-warning-600 bg-gradient-to-b from-warning-500 to-warning-600 text-white'
              : 'border-gray-200 bg-white text-gray-400 hover:border-warning-500/60 hover:text-warning-600',
          )}
        >
          <X size={22} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
