import { useState } from 'react'
import { useGetBusesQuery, useCreateBusMutation, useDeleteBusMutation } from './busApi'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Plus, Trash2, Bus, Users } from 'lucide-react'

export default function BusListPage() {
  const { data: buses = [], isLoading } = useGetBusesQuery()
  const [createBus, { isLoading: creating }] = useCreateBusMutation()
  const [deleteBus] = useDeleteBusMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    licensePlate: '', name: '', capacity: 30,
    photoFront: '', photoSide: '', photoRear: '',
  })
  const [formError, setFormError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    try {
      await createBus(form).unwrap()
      setForm({ licensePlate: '', name: '', capacity: 30, photoFront: '', photoSide: '', photoRear: '' })
      setShowForm(false)
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setFormError(typeof message === 'string' ? message : 'Failed to create bus')
    }
  }

  if (isLoading) return <div className="p-8 text-slate-400">Loading buses…</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Buses</h2>
          <p className="text-sm text-slate-500 mt-0.5">{buses.length} registered</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1.5" /> Register Bus
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">License Plate</label>
                  <Input placeholder="51A-123.45" value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Bus Name</label>
                  <Input placeholder="Bus Alpha" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Capacity (seats)</label>
                  <Input type="number" min={1} value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Photos (URLs) — all 3 required</p>
                <Input placeholder="Front view URL" value={form.photoFront}
                  onChange={(e) => setForm({ ...form, photoFront: e.target.value })} required />
                <Input placeholder="Side view URL" value={form.photoSide}
                  onChange={(e) => setForm({ ...form, photoSide: e.target.value })} required />
                <Input placeholder="Rear view URL" value={form.photoRear}
                  onChange={(e) => setForm({ ...form, photoRear: e.target.value })} required />
                <p className="text-xs text-slate-400">
                  Photos are required for accounting and payment verification.
                </p>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>{creating ? 'Registering…' : 'Register'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {buses.length === 0 && (
          <div className="text-center py-16 text-slate-400">No buses registered yet.</div>
        )}
        {buses.map((bus) => (
          <Card key={bus.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {[bus.photoFront, bus.photoSide, bus.photoRear].map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={['front', 'side', 'rear'][i]}
                        className="w-14 h-10 object-cover rounded border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/56x40/e2e8f0/94a3b8?text=${['F','S','R'][i]}`
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Bus size={14} className="text-slate-400" />
                      <span className="font-medium">{bus.name}</span>
                      <Badge variant="secondary">{bus.licensePlate}</Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <Users size={11} />
                      {bus.capacity} seats
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => deleteBus(bus.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
