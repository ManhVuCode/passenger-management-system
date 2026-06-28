import { useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetTripQuery, useUpdateRoundStatusMutation } from '../trips/tripsApi'
import {
  useGetAllocationsByRoundQuery,
  useMarkAttendanceMutation,
  useResetAttendanceMutation,
  type RoundPassengerAllocation,
} from '../allocation/allocationApi'
import { useAttendanceSocket, type AttendanceUpdate } from '../../hooks/useAttendanceSocket'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'
import { ArrowLeft, Bus as BusIcon, Check, X, Clock, Users, Megaphone, Play, CheckCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RoundStatus } from '@pms/shared'

/** Màn điểm danh của tài xế cho ĐÚNG xe của mình trong một round (mobile-first).
 *  Dùng chung getAllocationsByRound + mark/reset (đã có optimistic) như màn admin. */
export default function DriverAttendancePage() {
  const { tripId, roundId, busId } = useParams<{ tripId: string; roundId: string; busId: string }>()
  const { t } = useTranslation()
  const { data: trip } = useGetTripQuery(tripId!)
  const { data: allocations = [], isLoading, refetch } = useGetAllocationsByRoundQuery({
    tripId: tripId!,
    roundId: roundId!,
  })
  const [broadcastAlert, setBroadcastAlert] = useState<string | null>(null)

  useAttendanceSocket({
    tripId,
    onAttendanceUpdate: useCallback(
      (d: AttendanceUpdate) => {
        if (d.roundId === roundId) refetch()
      },
      [roundId, refetch],
    ),
    onBroadcastAlert: useCallback((m: string) => setBroadcastAlert(m), []),
  })

  const [updateRoundStatus, { isLoading: updatingStatus }] = useUpdateRoundStatusMutation()

  const rows = allocations.filter((a) => (a.roundBusAssignment?.busId ?? a.busId) === busId)
  const round = trip?.rounds.find((r) => r.id === roundId)
  const status = (round?.status ?? 'PLANNED') as RoundStatus
  const canMark = status !== RoundStatus.CANCELLED && status !== RoundStatus.DONE
  const busInfo = rows[0]?.roundBusAssignment?.bus
  const joined = rows.filter((r) => r.attendanceRecord?.status === 'JOIN').length
  const absent = rows.filter((r) => r.attendanceRecord?.status === 'ABSENT').length
  const pending = rows.length - joined - absent

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-2xl flex-col p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/me"
          aria-label={t('common.back')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-navy-900"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {trip?.name ?? '…'}
          </p>
          <h1 className="truncate font-display text-lg font-bold text-navy-900">
            {round?.name ?? t('nav.myRounds')}
          </h1>
        </div>
        <Badge variant={status as BadgeVariant} label={t(`status.${status}`)} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-100">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-navy-900">
          <BusIcon size={16} className="shrink-0 text-primary-600" />
          <span className="truncate">
            {busInfo?.name ?? 'Bus'} · {busInfo?.licensePlate ?? busId?.slice(0, 6)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3 text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1 text-success-600">
            <Check size={13} /> {joined}
          </span>
          <span className="flex items-center gap-1 text-danger-600">
            <X size={13} /> {absent}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Clock size={13} /> {pending}
          </span>
        </span>
      </div>

      {!canMark && (
        <div className="mb-3 rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600">
          {status === RoundStatus.CANCELLED
            ? t('attendance.roundCancelledNotice')
            : t('me.roundDoneNotice')}
        </div>
      )}

      <div className="flex-1 space-y-2">
        {isLoading ? (
          <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
            <EmptyState icon={Clock} title={t('common.loading')} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
            <EmptyState icon={Users} title={t('allocation.noPassengersAllocated')} />
          </div>
        ) : (
          rows.map((a, i) => (
            <DriverRow
              key={a.id}
              a={a}
              index={i}
              tripId={tripId!}
              roundId={roundId!}
              busId={busId!}
              canMark={canMark}
            />
          ))
        )}
      </div>

      {status === RoundStatus.PLANNED && (
        <Button
          className="mt-4 h-12 w-full gap-2"
          disabled={updatingStatus}
          onClick={() => updateRoundStatus({ tripId: tripId!, roundId: roundId!, status: 'IN_PROGRESS' })}
        >
          <Play size={16} /> {t('rounds.startRound')}
        </Button>
      )}
      {status === RoundStatus.IN_PROGRESS && (
        <Button
          className="mt-4 h-12 w-full gap-2"
          disabled={updatingStatus}
          onClick={() => updateRoundStatus({ tripId: tripId!, roundId: roundId!, status: 'DONE' })}
        >
          <CheckCheck size={16} /> {t('rounds.completeRound')}
        </Button>
      )}

      <AnimatePresence>
        {broadcastAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/70 p-6 backdrop-blur-md"
            onClick={() => setBroadcastAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-float"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Megaphone size={28} />
              </div>
              <h3 className="font-display text-lg font-bold text-navy-900">{t('me.broadcastAlert')}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{broadcastAlert}</p>
              <Button className="mt-5 w-full" onClick={() => setBroadcastAlert(null)}>
                {t('me.gotIt')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DriverRow({
  a,
  index,
  tripId,
  roundId,
  busId,
  canMark,
}: {
  a: RoundPassengerAllocation
  index: number
  tripId: string
  roundId: string
  busId: string
  canMark: boolean
}) {
  const { t } = useTranslation()
  const [mark, { isLoading: marking }] = useMarkAttendanceMutation()
  const [reset, { isLoading: resetting }] = useResetAttendanceMutation()
  const busy = marking || resetting
  const status = a.attendanceRecord?.status
  const isJoined = status === 'JOIN'
  const isAbsent = status === 'ABSENT'
  const isPending = !status

  function set(next: 'PENDING' | 'JOIN' | 'ABSENT') {
    if (!canMark || busy) return
    if (next === 'PENDING') {
      if (isPending) return
      reset({ tripId, roundId, busId, roundPassengerAssignmentIds: [a.id] })
    } else {
      if (status === next) return
      mark({ tripId, roundId, busId, roundPassengerAssignmentIds: [a.id], status: next })
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-gray-100">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isJoined
            ? 'bg-success-100 text-success-700'
            : isAbsent
              ? 'bg-warning-100 text-[#92400e]'
              : 'bg-gray-100 text-gray-600',
        )}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-navy-800">{a.tripPassengerAssignment.name}</h4>
        <p className="truncate text-xs text-gray-500">
          {a.tripPassengerAssignment.phone || '—'}
          {a.tripPassengerAssignment.type ? ` · ${a.tripPassengerAssignment.type}` : ''}
        </p>
      </div>
      <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-gray-200">
        <button
          disabled={!canMark || busy}
          onClick={() => set('PENDING')}
          aria-label={t('attendance.pending')}
          className={cn(
            'flex h-11 w-12 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            isPending ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50',
          )}
        >
          <Clock size={16} />
        </button>
        <button
          disabled={!canMark || busy}
          onClick={() => set('JOIN')}
          aria-label={t('attendance.join')}
          className={cn(
            'flex h-11 w-12 items-center justify-center border-l border-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            isJoined ? 'bg-success-600 text-white' : 'bg-white text-gray-400 hover:bg-success-50 hover:text-success-600',
          )}
        >
          <Check size={20} strokeWidth={3} />
        </button>
        <button
          disabled={!canMark || busy}
          onClick={() => set('ABSENT')}
          aria-label={t('attendance.absent')}
          className={cn(
            'flex h-11 w-12 items-center justify-center border-l border-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            isAbsent ? 'bg-warning-500 text-white' : 'bg-white text-gray-400 hover:bg-warning-50 hover:text-warning-600',
          )}
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
