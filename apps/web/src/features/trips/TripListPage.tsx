import { useState } from 'react'
import { useGetTripsQuery, useCreateTripMutation, useDeleteTripMutation } from './tripsApi'
import { getTripHighlight, TRIP_HIGHLIGHT_CLASSES } from './tripUtils'
import { TripStatus } from '@pms/shared'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Plus, Trash2, Calendar } from 'lucide-react'

const STATUS_BADGE: Record<TripStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'success',
  DONE: 'default',
  CANCELLED: 'destructive',
}

export default function TripListPage() {
  const { data: trips = [], isLoading } = useGetTripsQuery()
  const [createTrip, { isLoading: creating }] = useCreateTripMutation()
  const [deleteTrip] = useDeleteTripMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [formError, setFormError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (form.name.includes('/')) {
      setFormError('Trip name must not contain "/"')
      return
    }
    try {
      await createTrip(form).unwrap()
      setForm({ name: '', startDate: '', endDate: '' })
      setShowForm(false)
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setFormError(typeof message === 'string' ? message : 'Failed to create trip')
    }
  }

  if (isLoading) return <div className="p-8 text-slate-400">Loading trips…</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Trips</h2>
          <p className="text-sm text-slate-500 mt-0.5">{trips.length} total</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1.5" /> New Trip
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div className="col-span-3 space-y-1">
                <label className="text-sm font-medium">Trip Name</label>
                <Input
                  placeholder='e.g. Hanoi to Sapa (no "/")'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {formError && <p className="text-xs text-red-500">{formError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {trips.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            No trips yet. Create your first trip.
          </div>
        )}
        {trips.map((trip) => {
          const highlight = getTripHighlight(trip.startDate, trip.endDate, trip.status as TripStatus)
          return (
            <div
              key={trip.id}
              className={`rounded-lg border p-4 flex items-center justify-between ${TRIP_HIGHLIGHT_CLASSES[highlight]}`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium">{trip.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                    <Calendar size={12} />
                    {new Date(trip.startDate).toLocaleDateString()} →{' '}
                    {new Date(trip.endDate).toLocaleDateString()}
                    {highlight === 'approaching' && (
                      <span className="ml-2 text-amber-600 font-medium">⚡ Starting soon</span>
                    )}
                    {highlight === 'active' && (
                      <span className="ml-2 text-green-600 font-medium">● Active now</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_BADGE[trip.status as TripStatus]}>
                  {trip.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTrip(trip.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
