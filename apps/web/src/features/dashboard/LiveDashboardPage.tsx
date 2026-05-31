import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetTripQuery } from '../trips/tripsApi'
import { useGetAllocationsByRoundQuery } from '../allocation/allocationApi'
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="h-14 px-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm relative z-30 sticky top-0">
        <div className="flex items-center gap-4">
          <Link
            to={`/trips/${tripId}`}
            className="p-1.5 text-gray-400 hover:text-gray-950 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('nav.trips')}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold text-gray-950 truncate max-w-[260px]">
                {trip?.name ?? '…'} — {t('trips.liveDashboard')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-success-600 animate-pulse' : 'bg-gray-300',
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  isConnected ? 'text-success-600' : 'text-gray-400',
                )}
              >
                {isConnected ? t('attendance.connected') : t('attendance.connecting')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rounds.slice(0, 5).map((round) => {
            const isActive = activeRoundId === round.id
            return (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id)}
                className={cn(
                  'h-8 px-4 text-xs font-bold rounded-lg transition-all border',
                  isActive
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600',
                )}
              >
                #{round.sequence}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[260px] bg-white border-r border-gray-100 p-4 space-y-2 overflow-y-auto">
          <p className="px-2 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {t('rounds.title')}
          </p>
          {rounds.length === 0 && (
            <p className="px-2 text-xs text-gray-400">{t('rounds.noRounds')}</p>
          )}
          {rounds.map((round) => {
            const isActive = activeRoundId === round.id
            const status = (roundStatuses[round.id] ?? round.status) as RoundStatus
            return (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id)}
                className={cn(
                  'w-full p-4 rounded-xl text-left border transition-all',
                  isActive
                    ? 'bg-primary-50 border-primary-200 shadow-sm'
                    : 'border-transparent hover:bg-gray-50',
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={cn(
                      'text-sm font-bold truncate',
                      isActive ? 'text-primary-600' : 'text-gray-950',
                    )}
                  >
                    Round {round.sequence}: {round.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-xs truncate',
                      isActive ? 'text-primary-600/70' : 'text-gray-500',
                    )}
                  >
                    {round.departurePoint} → {round.arrivalPoint}
                  </p>
                  <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
                </div>
              </button>
            )
          })}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6">
          {activeRoundId ? (
            <TabTransition tabKey={activeRoundId}>
              <RoundBreakdown tripId={tripId!} roundId={activeRoundId} />
            </TabTransition>
          ) : (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100">
              <EmptyState icon={Clock} title={t('attendance.waitingUpdates')} />
            </div>
          )}
        </main>

        <aside className="w-[300px] bg-white border-l border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('attendance.liveFeed')}
            </h4>
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-success-600 animate-pulse' : 'bg-gray-300',
              )}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {liveUpdates.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex gap-3 relative pb-4 group"
                >
                  <div className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-100 group-last:hidden" />
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm mt-0.5',
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
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-gray-950 truncate">
                        {log.passengerName}
                      </p>
                      <span className="text-[10px] font-medium text-gray-400 ml-2 shrink-0">
                        {new Date(log.markedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                      {t('attendance.markedStatus', { status: log.status })}
                    </p>
                    <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mt-1">
                      Bus {log.busId.slice(0, 6)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {liveUpdates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 opacity-40">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                      className="w-1 h-1 rounded-full bg-gray-400"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('attendance.waitingUpdates')}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button variant="outline" className="w-full text-xs gap-2">
              <MessageSquare size={14} /> {t('notifications.broadcast')}
            </Button>
          </div>
        </aside>
      </div>
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
      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <EmptyState icon={Users} title={t('allocation.noPassengersAllocated')} />
      </div>
    )
  }

  const totalJoined = allocations.filter((a) => a.attendanceRecord?.status === 'JOIN').length
  const totalAbsent = allocations.filter((a) => a.attendanceRecord?.status === 'ABSENT').length
  const totalPending = allocations.filter((a) => !a.attendanceRecord).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {Object.entries(byBus).map(([busId, rows]) => {
        const joined = rows.filter((r) => r.attendanceRecord?.status === 'JOIN').length
        const absent = rows.filter((r) => r.attendanceRecord?.status === 'ABSENT').length
        const pending = rows.filter((r) => !r.attendanceRecord).length
        const total = rows.length
        const marked = joined + absent
        const pct = total > 0 ? Math.round((marked / total) * 100) : 0
        const color = absent > 0 ? 'warning' : 'success'
        const busInfo = rows[0]?.roundBusAssignment?.bus

        return (
          <div
            key={busId}
            className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary-600">
                  <BusIcon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950">
                    {busInfo?.name ?? `Bus ${busId.slice(0, 8)}`}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wide font-mono">
                    {busInfo?.licensePlate ?? busId.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-950">
                  {marked}
                  <span className="text-gray-400">/{total}</span>
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('attendance.liveTitle')}
                </p>
              </div>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    color === 'success' ? 'bg-success-600' : 'bg-warning-500',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {t('attendance.join')}
                  </span>
                  <span className="text-sm font-bold text-success-600 flex items-center gap-1">
                    <Check size={13} /> {joined}
                  </span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {t('attendance.absent')}
                  </span>
                  <span className="text-sm font-bold text-danger-600 flex items-center justify-center gap-1">
                    <X size={13} /> {absent}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {t('attendance.pending')}
                  </span>
                  <span className="text-sm font-bold text-gray-400 flex items-center justify-end gap-1">
                    <Clock size={13} /> {pending}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-1">
                {rows.slice(0, 4).map((r) => {
                  const st = r.attendanceRecord?.status
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            st === 'JOIN'
                              ? 'bg-success-600'
                              : st === 'ABSENT'
                                ? 'bg-warning-500'
                                : 'bg-gray-300',
                          )}
                        />
                        <span className="text-xs font-bold text-gray-950 truncate">
                          {r.tripPassengerAssignment.name}
                        </span>
                      </div>
                      {st ? (
                        <Badge variant={st as BadgeVariant} label={t(`status.${st}`)} />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {t('status.PENDING')}
                        </span>
                      )}
                    </div>
                  )
                })}
                {rows.length > 4 && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2">
                    + {rows.length - 4} more
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
