import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGetTripQuery } from '../trips/tripsApi'
import { useGetAllocationsByRoundQuery } from '../allocation/allocationApi'
import {
  useAttendanceSocket,
  type AttendanceUpdate,
  type RoundStatusUpdate,
} from '../../hooks/useAttendanceSocket'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Activity, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react'

interface LiveRecord {
  passengerId: string
  passengerName: string
  status: string
  markedAt: string
  busId: string
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  JOIN: 'success',
  ABSENT: 'warning',
  CANCELLED: 'destructive',
  PLANNED: 'secondary',
  IN_PROGRESS: 'warning',
  DONE: 'success',
}

export default function LiveDashboardPage() {
  const { tripId } = useParams<{ tripId: string }>()
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
            passengerId: data.passengerId,
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

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link to="/trips" className="hover:text-primary">Trips</Link>
            <ChevronRight size={12} />
            <Link to={`/trips/${tripId}`} className="hover:text-primary">{trip?.name}</Link>
            <ChevronRight size={12} />
            <span>Live Dashboard</span>
          </div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Activity size={22} className="text-green-500" />
            Live Attendance Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-sm ${isConnected ? 'text-green-600' : 'text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            {isConnected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Rounds</h3>
          {(trip?.rounds ?? []).map((round) => {
            const liveStatus = roundStatuses[round.id] ?? round.status
            return (
              <Card
                key={round.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedRound === round.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Round {round.sequence}: {round.name}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[liveStatus] ?? 'secondary'}>{liveStatus}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="col-span-1">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {selectedRound ? 'Allocation' : 'Select a round'}
          </h3>
          {selectedRound && <RoundBreakdown tripId={tripId!} roundId={selectedRound} />}
        </div>

        <div className="col-span-1">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Live Feed
          </h3>
          <Card>
            <CardContent className="p-3 space-y-2 max-h-96 overflow-auto">
              {liveUpdates.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">
                  Waiting for attendance updates…
                </p>
              )}
              {liveUpdates.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                >
                  <span className="font-medium truncate">{u.passengerName}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant={STATUS_BADGE[u.status] ?? 'secondary'} className="text-xs">
                      {u.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(u.markedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RoundBreakdown({ tripId, roundId }: { tripId: string; roundId: string }) {
  const { data: allocations = [] } = useGetAllocationsByRoundQuery({ tripId, roundId })

  const byBus = allocations.reduce<Record<string, typeof allocations>>((acc, a) => {
    const bid = a.roundBusAssignment?.busId ?? a.busId
    if (!acc[bid]) acc[bid] = []
    acc[bid].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      {Object.entries(byBus).map(([busId, rows]) => {
        const joined = rows.filter((r) => r.attendanceRecord?.status === 'JOIN').length
        const absent = rows.filter((r) => r.attendanceRecord?.status === 'ABSENT').length
        const pending = rows.filter((r) => !r.attendanceRecord).length
        const total = rows.length
        const pct = total > 0 ? Math.round((joined / total) * 100) : 0

        return (
          <Card key={busId}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{rows[0]?.roundBusAssignment?.bus?.name ?? `Bus`}</span>
                <span className="text-xs font-normal text-slate-400">{joined}/{total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <UserCheck size={10} /> {joined}
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <UserX size={10} /> {absent}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> {pending} pending
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
      {Object.keys(byBus).length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No passengers allocated yet.</p>
      )}
    </div>
  )
}
