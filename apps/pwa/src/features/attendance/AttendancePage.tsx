import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  useGetPassengersForBusQuery,
  useMarkAttendanceMutation,
  useGetAttendanceSummaryQuery,
  useUpdateRoundStatusMutation,
} from './attendanceApi'
import { useAttendanceSocket, type AttendanceUpdate } from '../../hooks/useAttendanceSocket'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { UserCheck, UserX, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'destructive'> = {
  JOIN: 'success',
  ABSENT: 'warning',
  CANCELLED: 'destructive',
}

export default function AttendancePage() {
  const { tripId, roundId, busId } = useParams<{
    tripId: string
    roundId: string
    busId: string
  }>()

  const { data: passengers = [], isLoading } = useGetPassengersForBusQuery({
    tripId: tripId!, roundId: roundId!, busId: busId!,
  })
  const { data: summary } = useGetAttendanceSummaryQuery({ tripId: tripId!, roundId: roundId! })
  const [markAttendance, { isLoading: marking }] = useMarkAttendanceMutation()
  const [updateRoundStatus] = useUpdateRoundStatusMutation()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [peerUpdates, setPeerUpdates] = useState<{ name: string; status: string }[]>([])

  useAttendanceSocket({
    tripId,
    onAttendanceUpdate: useCallback(
      (data: AttendanceUpdate) => {
        if (data.busId !== busId) {
          setPeerUpdates((prev) =>
            [{ name: data.passengerName, status: data.status }, ...prev].slice(0, 5),
          )
        }
      },
      [busId],
    ),
  })

  async function handleMark(rpaId: string, status: 'JOIN' | 'ABSENT') {
    await markAttendance({
      tripId: tripId!, roundId: roundId!, busId: busId!,
      rpaIds: [rpaId], status,
    })
  }

  async function handleMarkAll(status: 'JOIN' | 'ABSENT') {
    const unmarked = passengers
      .filter((p) => !p.attendanceRecord)
      .map((p) => p.id)
    if (!unmarked.length) return
    await markAttendance({
      tripId: tripId!, roundId: roundId!, busId: busId!,
      rpaIds: unmarked, status,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading passengers…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-border sticky top-0 z-10 px-4 py-3">
        <h1 className="font-bold text-base">Attendance</h1>
        {summary && (
          <div className="flex gap-3 mt-1.5 text-xs">
            <span className="text-green-600 font-medium">✓ {summary.join} joined</span>
            <span className="text-amber-600 font-medium">✗ {summary.absent} absent</span>
            <span className="text-slate-400">? {summary.pending} pending</span>
            <span className="text-slate-400 ml-auto">{summary.total} total</span>
          </div>
        )}
      </div>

      {peerUpdates.length > 0 && (
        <div className="mx-4 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-700 font-medium mb-1">Other buses updated:</p>
          {peerUpdates.slice(0, 3).map((u, i) => (
            <p key={i} className="text-xs text-blue-600">
              {u.name} → {u.status}
            </p>
          ))}
        </div>
      )}

      <div className="px-4 py-3 flex gap-2">
        <Button
          size="sm" variant="outline"
          className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
          onClick={() => handleMarkAll('JOIN')}
          disabled={marking}
        >
          <UserCheck size={14} className="mr-1.5" /> Mark All JOIN
        </Button>
        <Button
          size="sm" variant="outline"
          className="flex-1 text-amber-700 border-amber-200 hover:bg-amber-50"
          onClick={() => handleMarkAll('ABSENT')}
          disabled={marking}
        >
          <UserX size={14} className="mr-1.5" /> Mark All ABSENT
        </Button>
      </div>

      <div className="px-4 space-y-2">
        {passengers.map((p, idx) => {
          const status = p.attendanceRecord?.status
          const isExpanded = expandedNote === p.id

          return (
            <Card
              key={p.id}
              className={`transition-all ${
                status === 'JOIN' ? 'border-green-200'
                  : status === 'ABSENT' ? 'border-amber-200' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5">{idx + 1}</span>
                      <span className="font-medium text-sm truncate">
                        {p.tripPassengerAssignment.name}
                      </span>
                      {p.tripPassengerAssignment.type && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {p.tripPassengerAssignment.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 ml-7">
                      {p.tripPassengerAssignment.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {status && (
                      <Badge variant={STATUS_COLOR[status] ?? 'secondary'}>{status}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant={status === 'JOIN' ? 'default' : 'outline'}
                      className="h-8 w-8 p-0 text-green-700"
                      onClick={() => handleMark(p.id, 'JOIN')}
                      disabled={marking}
                    >
                      <UserCheck size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant={status === 'ABSENT' ? 'destructive' : 'outline'}
                      className="h-8 w-8 p-0"
                      onClick={() => handleMark(p.id, 'ABSENT')}
                      disabled={marking}
                    >
                      <UserX size={14} />
                    </Button>
                  </div>
                </div>

                {p.tripPassengerAssignment.note && (
                  <button
                    className="flex items-center gap-1 mt-2 ml-7 text-xs text-slate-400 hover:text-slate-600"
                    onClick={() => setExpandedNote(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    Note
                  </button>
                )}
                {isExpanded && (
                  <p className="mt-1 ml-7 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                    {p.tripPassengerAssignment.note}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
        <Button
          className="w-full"
          onClick={() => updateRoundStatus({ tripId: tripId!, roundId: roundId!, status: 'DONE' })}
        >
          Complete Round → DONE
        </Button>
      </div>
    </div>
  )
}
