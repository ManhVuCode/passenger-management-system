import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
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
  const [updateRoundStatus] = useUpdateRoundStatusMutation()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [peerUpdate, setPeerUpdate] = useState<string | null>(null)
  const [broadcastAlert, setBroadcastAlert] = useState<string | null>(null)
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
          setPeerUpdate(`Bus ${data.busId.slice(0, 6)}: ${data.passengerName} → ${data.status} · ${time}`)
          window.setTimeout(() => setPeerUpdate(null), 4000)
        }
      },
      [busId],
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
    const unmarked = passengers.filter((p) => !p.attendanceRecord).map((p) => p.id)
    if (!unmarked.length) return
    await markAttendance({
      tripId: tripId!,
      roundId: roundId!,
      busId: busId!,
      rpaIds: unmarked,
      status,
    })
  }

  async function handleComplete() {
    await updateRoundStatus({ tripId: tripId!, roundId: roundId!, status: 'DONE' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading passengers…</p>
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
              <h3 className="text-xl font-bold text-gray-950 mb-2">Broadcast Alert</h3>
              <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-line">
                {broadcastAlert}
              </p>
              <Button
                size="lg"
                className="w-full rounded-2xl"
                onClick={() => setBroadcastAlert(null)}
              >
                Got it
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex flex-col shadow-sm">
        <div className="h-14 px-4 flex items-center gap-3">
          <Link
            to="/"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-950"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-950 truncate">Attendance</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Bus · {summary?.total ?? passengers.length} seats
            </p>
          </div>
          <button className="p-2 text-gray-400" aria-label="Search">
            <Search size={20} />
          </button>
        </div>

        {summary && (
          <div className="h-10 px-5 flex items-center justify-between border-t border-gray-50 bg-white">
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
              <span className="text-success-600">✓ {summary.join} Joined</span>
              <span className="text-warning-500">✗ {summary.absent} Absent</span>
              <span className="text-gray-400">? {summary.pending} Pending</span>
            </div>
          </div>
        )}
      </header>

      {!isOnline && (
        <div className="bg-warning-500 text-white px-5 py-1.5 flex items-center gap-2 text-[11px] font-bold">
          <WifiOff size={14} />
          Offline — marks queued, will sync on reconnect
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
          disabled={marking}
        >
          <Check size={14} /> Mark All Present
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white border-warning-500/30 text-warning-500 text-xs gap-2"
          onClick={() => handleMarkAll('ABSENT')}
          disabled={marking}
        >
          <X size={14} /> Mark All Absent
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-px">
          {passengers.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">
              No passengers allocated to this bus.
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
                  'px-5 py-4 bg-white border-b border-gray-50 flex items-center gap-4 transition-colors min-h-16',
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
                      ▼ Note: {noteText}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleMark(p.id, 'JOIN')}
                    disabled={marking}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2',
                      isJoined
                        ? 'bg-success-600 border-success-600 text-white shadow-lg shadow-success-600/30 scale-105'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-success-600/40',
                    )}
                    aria-label="Mark JOIN"
                  >
                    <Check size={20} strokeWidth={3} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleMark(p.id, 'ABSENT')}
                    disabled={marking}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2',
                      isAbsent
                        ? 'bg-warning-500 border-warning-500 text-white shadow-lg shadow-warning-500/30 scale-105'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-warning-500/40',
                    )}
                    aria-label="Mark ABSENT"
                  >
                    <X size={20} strokeWidth={3} />
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
          disabled={!someMarked}
          onClick={handleComplete}
        >
          <Check size={20} />
          Complete Round → DONE
        </Button>
      </div>
    </div>
  )
}
