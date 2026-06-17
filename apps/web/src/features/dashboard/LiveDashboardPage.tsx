import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence, animate, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetTripQuery } from '../trips/tripsApi'
import { useGetAllocationsByRoundQuery } from '../allocation/allocationApi'
import { useSendNotificationMutation } from '../notifications/notificationApi'
import {
  useAttendanceSocket,
  type AttendanceUpdate,
  type RoundStatusUpdate,
} from '../../hooks/useAttendanceSocket'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { MetricCard } from '../../components/ui/metric-card'
import { EmptyState } from '../../components/ui/empty-state'
import { TabTransition } from '../../components/ui/tab-transition'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Bus as BusIcon,
  MessageSquare,
  Check,
  X,
  Clock,
  Users,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { RoundStatus } from '@pms/shared'

interface LiveRecord {
  id: number
  passengerName: string
  status: string
  markedAt: string
  busId: string
}

/**
 * Con số đếm tăng dần (count-up) cho các numeral nhỏ trên dashboard realtime.
 * Khi giá trị đổi (socket/polling) sẽ đếm từ giá trị cũ sang giá trị mới.
 * Tôn trọng prefers-reduced-motion: hiển thị ngay con số cuối.
 */
function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value
    if (reduce || from === value) {
      node.textContent = String(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, reduce])

  // Render giá trị cuối làm fallback (trước khi effect chạy)
  return <span ref={ref}>{value}</span>
}

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
  const [liveUpdates, setLiveUpdates] = useState<LiveRecord[]>([])
  const [roundStatuses, setRoundStatuses] = useState<Record<string, string>>({})

  const { isConnected } = useAttendanceSocket({
    tripId,
    onAttendanceUpdate: useCallback((data: AttendanceUpdate) => {
      setLiveUpdates((prev) =>
        [
          {
            id: Date.now() + Math.random(),
            passengerName: data.passengerName,
            status: data.status,
            markedAt: data.markedAt,
            busId: data.busId,
          },
          ...prev,
        ].slice(0, 20),
      )
    }, []),
    onRoundStatusUpdate: useCallback((data: RoundStatusUpdate) => {
      setRoundStatuses((prev) => ({ ...prev, [data.roundId]: data.status }))
    }, []),
  })

  const rounds = trip?.rounds ?? []
  const activeRoundId = selectedRound ?? rounds[0]?.id ?? null

  const [sendBroadcast, { isLoading: broadcasting }] = useSendNotificationMutation()
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)

  async function handleBroadcast() {
    if (!tripId || !activeRoundId) return
    setBroadcastResult(null)
    try {
      const res = await sendBroadcast({
        tripId,
        roundId: activeRoundId,
        channel: 'IN_APP',
        message: t('notifications.broadcastDefault'),
      }).unwrap()
      setBroadcastResult(t('notifications.broadcastSent', { count: res.sent }))
    } catch {
      setBroadcastResult(t('notifications.broadcastFailed'))
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Thanh điều khiển trên cùng: glass bar + breadcrumb + chip LIVE + pill chọn round ── */}
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

          {/* Chip trạng thái kết nối realtime */}
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

        {/* Segmented control chọn nhanh round — pill active trượt bằng layoutId */}
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
        {/* ── Rail trái: danh sách round, nền active trượt theo lựa chọn ── */}
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

        {/* ── Khu trung tâm: số liệu + breakdown theo xe ── */}
        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          {activeRoundId ? (
            <TabTransition tabKey={activeRoundId}>
              <RoundBreakdown tripId={tripId!} roundId={activeRoundId} />
            </TabTransition>
          ) : (
            <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
              <EmptyState icon={Clock} title={t('attendance.waitingUpdates')} />
            </div>
          )}
        </main>

        {/* ── Cột phải: live feed điểm danh + hành động thông báo ── */}
        <aside className="flex w-[312px] shrink-0 flex-col border-l border-gray-200/70 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
              {t('attendance.liveFeed')}
            </h4>
            <LiveDot connected={isConnected} />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {liveUpdates.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -14, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 18, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="group relative"
                >
                  {/* Đường nối timeline giữa các sự kiện */}
                  <div
                    className="absolute bottom-0 left-[19px] top-9 w-px bg-gray-100 group-last:hidden"
                    aria-hidden="true"
                  />
                  {/* Flash highlight nhẹ khi sự kiện mới vừa tới rồi mờ dần */}
                  <motion.div
                    initial={{ backgroundColor: 'rgba(14, 165, 233, 0.09)' }}
                    animate={{ backgroundColor: 'rgba(14, 165, 233, 0)' }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    className="relative flex gap-3 rounded-xl p-1.5 pb-4"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm',
                        log.status === 'JOIN'
                          ? 'bg-success-600 text-white'
                          : log.status === 'ABSENT'
                            ? 'bg-warning-500 text-white'
                            : 'bg-danger-600 text-white',
                      )}
                    >
                      {log.status === 'JOIN' ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <p className="truncate text-xs font-bold text-navy-900">
                          {log.passengerName}
                        </p>
                        <span className="ml-2 shrink-0 text-[10px] font-medium tabular-nums text-gray-400">
                          {new Date(log.markedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-medium text-gray-600">
                        {t('attendance.markedStatus', { status: log.status })}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-primary-600">
                        Bus {log.busId.slice(0, 6)}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>

            {liveUpdates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="mb-2.5 flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gray-300"
                      style={{ animationDelay: `${i * 0.25}s` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {t('attendance.waitingUpdates')}
                </span>
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-gray-100 p-4">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={handleBroadcast}
              disabled={broadcasting || !activeRoundId}
            >
              <MessageSquare size={14} />{' '}
              {broadcasting ? t('notifications.broadcasting') : t('notifications.inApp')}
            </Button>
            <AnimatePresence>
              {broadcastResult && (
                <motion.p
                  key="broadcast-result"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-center text-[11px] font-medium text-gray-600"
                >
                  {broadcastResult}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  )
}

/**
 * Một hàng hành khách trong card xe. Khi trạng thái điểm danh đổi qua realtime,
 * lớp phủ highlight xanh nháy lên rồi mờ dần (AnimatePresence keyed theo lần đổi).
 */
function PassengerRow({ name, status }: { name: string; status?: string }) {
  const { t } = useTranslation()
  const prev = useRef<string | undefined>(status)
  const [flashId, setFlashId] = useState(0)

  useEffect(() => {
    if (prev.current !== status) {
      prev.current = status
      setFlashId((n) => n + 1)
    }
  }, [status])

  return (
    <div className="relative flex items-center justify-between rounded-lg p-2 transition-colors duration-200 hover:bg-gray-50">
      <AnimatePresence>
        {flashId > 0 && (
          <motion.span
            key={flashId}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 rounded-lg bg-primary-100/80"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <div className="relative flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300',
            status === 'JOIN'
              ? 'bg-success-600'
              : status === 'ABSENT'
                ? 'bg-warning-500'
                : 'bg-gray-300',
          )}
        />
        <span className="truncate text-xs font-bold text-navy-900">{name}</span>
      </div>
      <span className="relative shrink-0">
        {status ? (
          <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {t('status.PENDING')}
          </span>
        )}
      </span>
    </div>
  )
}

function RoundBreakdown({ tripId, roundId }: { tripId: string; roundId: string }) {
  const { t } = useTranslation()
  const { data: allocations = [] } = useGetAllocationsByRoundQuery({ tripId, roundId })

  const byBus = allocations.reduce<Record<string, typeof allocations>>((acc, a) => {
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

  const totalJoined = allocations.filter((a) => a.attendanceRecord?.status === 'JOIN').length
  const totalAbsent = allocations.filter((a) => a.attendanceRecord?.status === 'ABSENT').length
  const totalPending = allocations.filter((a) => !a.attendanceRecord).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label={t('attendance.totalLabel')}
          value={allocations.length}
          icon={Users}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <MetricCard
          label={t('attendance.join')}
          value={totalJoined}
          icon={CheckCircle2}
          color="text-success-600"
          bg="bg-success-50"
        />
        <MetricCard
          label={t('attendance.absent')}
          value={totalAbsent}
          icon={XCircle}
          color="text-warning-600"
          bg="bg-warning-50"
        />
        <MetricCard
          label={t('attendance.pending')}
          value={totalPending}
          icon={Clock}
          color="text-gray-500"
          bg="bg-gray-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Object.entries(byBus).map(([busId, rows], i) => {
          const joined = rows.filter((r) => r.attendanceRecord?.status === 'JOIN').length
          const absent = rows.filter((r) => r.attendanceRecord?.status === 'ABSENT').length
          const pending = rows.filter((r) => !r.attendanceRecord).length
          const total = rows.length
          const marked = joined + absent
          const pct = total > 0 ? Math.round((marked / total) * 100) : 0
          const color = absent > 0 ? 'warning' : 'success'
          const busInfo = rows[0]?.roundBusAssignment?.bus

          return (
            <motion.div
              key={busId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.05, 0.4) }}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-100 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              {/* Dải header: xe + tiến độ đã điểm danh */}
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
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl font-bold tabular-nums leading-none text-navy-900">
                    <AnimatedNumber value={marked} />
                    <span className="text-base font-semibold text-gray-400">/{total}</span>
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t('attendance.markedShort')}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 p-5">
                {/* Thanh tiến độ + phần trăm đếm động */}
                <div className="flex items-center gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        'h-full rounded-full',
                        color === 'success'
                          ? 'bg-gradient-to-r from-emerald-400 to-success-600'
                          : 'bg-gradient-to-r from-amber-400 to-warning-500',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-display text-sm font-bold tabular-nums',
                      color === 'success' ? 'text-success-600' : 'text-warning-600',
                    )}
                  >
                    <AnimatedNumber value={pct} />%
                  </span>
                </div>

                <div className="flex justify-between px-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t('attendance.join')}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-success-600">
                      <Check size={13} /> <AnimatedNumber value={joined} />
                    </span>
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t('attendance.absent')}
                    </span>
                    <span className="flex items-center justify-center gap-1 text-sm font-bold tabular-nums text-danger-600">
                      <X size={13} /> <AnimatedNumber value={absent} />
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t('attendance.pending')}
                    </span>
                    <span className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-gray-500">
                      <Clock size={13} /> <AnimatedNumber value={pending} />
                    </span>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-50 pt-4">
                  {rows.slice(0, 4).map((r) => (
                    <PassengerRow
                      key={r.id}
                      name={r.tripPassengerAssignment.name}
                      status={r.attendanceRecord?.status}
                    />
                  ))}
                  {rows.length > 4 && (
                    <p className="pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      + {rows.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
