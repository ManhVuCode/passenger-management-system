import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetPassengersForBusQuery,
  useMarkAttendanceMutation,
  useGetAttendanceSummaryQuery,
  useUpdateRoundStatusMutation,
} from './attendanceApi'
import { useAttendanceSocket, type AttendanceUpdate } from '../../hooks/useAttendanceSocket'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import {
  ArrowLeft,
  Check,
  X,
  Search,
  Bell,
  WifiOff,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export default function AttendancePage() {
  const { tripId, roundId, busId } = useParams<{
    tripId: string
    roundId: string
    busId: string
  }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: passengers = [], isLoading } = useGetPassengersForBusQuery({
    tripId: tripId!,
    roundId: roundId!,
    busId: busId!,
  })
  const { data: summary } = useGetAttendanceSummaryQuery({
    tripId: tripId!,
    roundId: roundId!,
  })
  const [markAttendance, { isLoading: marking }] = useMarkAttendanceMutation()
  const [updateRoundStatus, { isLoading: completing }] = useUpdateRoundStatusMutation()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [peerUpdate, setPeerUpdate] = useState<string | null>(null)
  const [broadcastAlert, setBroadcastAlert] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  useAttendanceSocket({
    tripId,
    onAttendanceUpdate: useCallback(
      (data: AttendanceUpdate) => {
        if (data.busId !== busId) {
          const time = new Date(data.markedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          setPeerUpdate(
            t('attendance.peerUpdate', {
              bus: data.busId.slice(0, 6),
              name: data.passengerName,
              status: t(`status.${data.status}` as const),
              time,
            }),
          )
          window.setTimeout(() => setPeerUpdate(null), 4000)
        }
      },
      [busId, t],
    ),
    onBroadcastAlert: useCallback((msg: string) => setBroadcastAlert(msg), []),
  })

  async function handleMark(rpaId: string, status: 'JOIN' | 'ABSENT') {
    await markAttendance({
      tripId: tripId!,
      roundId: roundId!,
      busId: busId!,
      rpaIds: [rpaId],
      status,
    })
  }

  async function handleMarkAll(status: 'JOIN' | 'ABSENT') {
    const all = passengers.map((p) => p.id)
    if (!all.length) return
    await markAttendance({
      tripId: tripId!,
      roundId: roundId!,
      busId: busId!,
      rpaIds: all,
      status,
    })
  }

  async function handleComplete() {
    setCompleteError(null)
    try {
      await updateRoundStatus({
        tripId: tripId!,
        roundId: roundId!,
        status: 'DONE',
      }).unwrap()
      setShowConfirm(false)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setCompleteError(typeof msg === 'string' ? msg : t('attendance.failedComplete'))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">{t('attendance.loadingPassengers')}</p>
      </div>
    )
  }

  const someMarked = passengers.some((p) => p.attendanceRecord)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[420px] mx-auto border-x border-gray-200">
      <AnimatePresence>
        {broadcastAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-[320px] text-center relative z-10"
            >
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📢</span>
              </div>
              <h3 className="text-xl font-bold text-gray-950 mb-2">
                {t('attendance.broadcastAlert')}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-line">
                {broadcastAlert}
              </p>
              <Button
                size="lg"
                className="w-full rounded-2xl"
                onClick={() => setBroadcastAlert(null)}
              >
                {t('common.gotIt')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 flex flex-col">
        <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
        <div className="bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="h-14 px-4 flex items-center gap-3">
            <Link
              to="/"
              className="p-2 -ml-2 text-gray-500 hover:text-navy-900"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-navy-900 truncate">{t('attendance.title')}</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {t('attendance.seats', { count: summary?.total ?? passengers.length })}
              </p>
            </div>
            <button className="p-2 text-gray-500" aria-label={t('common.search')}>
              <Search size={20} />
            </button>
          </div>

          {summary && (
            <div className="h-10 px-5 flex items-center justify-between border-t border-gray-50">
              <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1.5 text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-600" />
                  {t('attendance.joined', { count: summary.join })}
                </span>
                <span className="flex items-center gap-1.5 text-warning-600">
                  <span className="w-2 h-2 rounded-full bg-warning-500" />
                  {t('attendance.absent', { count: summary.absent })}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  {t('attendance.pending', { count: summary.pending })}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {!isOnline && (
        <div className="bg-warning-500 text-white px-5 py-2.5 flex items-center gap-2.5 text-[13px] font-bold shadow-md">
          <WifiOff size={16} />
          {t('attendance.offline')}
        </div>
      )}

      <AnimatePresence>
        {peerUpdate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary-50 px-5 py-2 overflow-hidden border-b border-primary-100"
          >
            <p className="text-[10px] font-bold text-primary-600 flex items-center gap-2">
              <Bell size={10} />
              {peerUpdate}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          className="bg-white border-success-600/30 text-success-600 text-xs gap-2"
          onClick={() => handleMarkAll('JOIN')}
          disabled={!passengers.length || marking}
        >
          <Check size={14} /> {t('attendance.markAllJoin')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white border-warning-500/30 text-warning-500 text-xs gap-2"
          onClick={() => handleMarkAll('ABSENT')}
          disabled={!passengers.length || marking}
        >
          <X size={14} /> {t('attendance.markAllAbsent')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-px">
          {passengers.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">
              {t('attendance.noPassengers')}
            </p>
          )}
          {passengers.map((p, i) => {
            const status = p.attendanceRecord?.status
            const isJoined = status === 'JOIN'
            const isAbsent = status === 'ABSENT'
            const noteText = p.tripPassengerAssignment.note
            const noteOpen = expandedNote === p.id

            return (
              <motion.div
                key={p.id}
                className={cn(
                  'px-5 py-4 bg-white border-b border-gray-50 flex items-center gap-4 transition-colors min-h-[80px]',
                  isJoined && 'bg-success-50/50 border-l-[4px] border-l-success-600 pl-[16px]',
                  isAbsent && 'bg-warning-50/50 border-l-[4px] border-l-warning-500 pl-[16px]',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[12px] font-bold shrink-0">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-gray-950 truncate">
                      {p.tripPassengerAssignment.name}
                    </h4>
                    {p.tripPassengerAssignment.type && (
                      <Badge
                        variant={`TYPE_${p.tripPassengerAssignment.type}` as BadgeVariant}
                        label={p.tripPassengerAssignment.type}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">{p.tripPassengerAssignment.phone}</p>
                  {noteText && (
                    <button
                      onClick={() => setExpandedNote(noteOpen ? null : p.id)}
                      className="mt-2 text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 italic max-w-full truncate text-left"
                    >
                      {t('attendance.noteLabel', { note: noteText })}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    animate={isJoined ? { scale: [1, 1.12, 1.05] } : { scale: 1 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => handleMark(p.id, 'JOIN')}
                    disabled={marking}
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 active:scale-90',
                      isJoined
                        ? 'bg-success-600 border-success-600 text-white shadow-lg shadow-success-600/40'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-success-600/60 active:bg-success-50',
                    )}
                    aria-label={t('status.JOIN')}
                  >
                    <Check size={26} strokeWidth={3.2} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    animate={isAbsent ? { scale: [1, 1.12, 1.05] } : { scale: 1 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => handleMark(p.id, 'ABSENT')}
                    disabled={marking}
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 active:scale-90',
                      isAbsent
                        ? 'bg-warning-500 border-warning-500 text-white shadow-lg shadow-warning-500/40'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-warning-500/60 active:bg-warning-50',
                    )}
                    aria-label={t('status.ABSENT')}
                  >
                    <X size={26} strokeWidth={3.2} />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto p-4 bg-white border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] z-40">
        <Button
          className="w-full h-14 rounded-xl text-md gap-3"
          disabled={!someMarked || completing}
          onClick={() => setShowConfirm(true)}
        >
          {completing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('attendance.completing')}
            </>
          ) : (
            <>
              <Check size={20} />
              {t('attendance.completeRound')}
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
            onClick={() => !completing && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-4xl text-center mb-3">✅</div>
              <h2 className="font-bold text-gray-950 text-center mb-2">
                {t('attendance.confirmCompleteTitle')}
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {t('attendance.confirmCompleteBody')}
              </p>
              {completeError && (
                <p className="text-[11px] text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2 mb-4 text-center">
                  {completeError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={completing}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex-1 h-11 rounded-xl bg-success-600 text-white text-sm font-bold hover:bg-success-600/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {completing && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {completing
                    ? t('attendance.completing')
                    : t('attendance.confirmCompleteButton')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
