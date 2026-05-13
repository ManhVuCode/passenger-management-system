import { Link } from 'react-router-dom'
import { useGetMyAssignmentsQuery } from '../attendance/attendanceApi'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ArrowRight, Bus } from 'lucide-react'

const STATUS_BADGE: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'destructive',
}

export default function HomePage() {
  const { data: assignments = [], isLoading } = useGetMyAssignmentsQuery()
  const isOnline = useOnlineStatus()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading assignments…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium">
          ⚡ Offline mode — showing cached data
        </div>
      )}

      <div className="bg-white border-b border-border px-4 py-4">
        <h1 className="font-bold text-lg">My Rounds</h1>
        <p className="text-sm text-slate-400">{assignments.length} assigned</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {assignments.length === 0 && (
          <p className="text-center py-16 text-slate-400 text-sm">
            No rounds assigned yet.
          </p>
        )}
        {assignments.map((a) => (
          <Link
            key={`${a.id}-${a.busId}`}
            to={`/trips/${a.trip.id}/rounds/${a.id}/buses/${a.busId}/attendance`}
          >
            <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{a.trip.name}</p>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      {a.departurePoint} <ArrowRight size={12} /> {a.arrivalPoint}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <Bus size={11} />
                      {a.bus.name} · {a.bus.licensePlate}
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[a.status] ?? 'secondary'}>{a.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
