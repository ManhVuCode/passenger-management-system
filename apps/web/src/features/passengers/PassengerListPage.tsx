import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useGetPassengersQuery,
  useCreatePassengerMutation,
  useUpdatePassengerMutation,
  useDeletePassengerMutation,
  useBulkCreatePassengersMutation,
  useSheetSyncMutation,
} from './passengerApi'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Plus, Trash2, FileSpreadsheet, Download, Pencil, Check, X } from 'lucide-react'

type TabKey = 'list' | 'add' | 'sheet'

export default function PassengerListPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { data: passengers = [], isLoading } = useGetPassengersQuery(tripId!)
  const [createPassenger] = useCreatePassengerMutation()
  const [updatePassenger] = useUpdatePassengerMutation()
  const [deletePassenger] = useDeletePassengerMutation()
  const [bulkCreate] = useBulkCreatePassengersMutation()
  const [sheetSync, { isLoading: syncing }] = useSheetSyncMutation()

  const [tab, setTab] = useState<TabKey>('list')
  const [form, setForm] = useState({ name: '', phone: '', idCard: '', type: '', note: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const token = localStorage.getItem('accessToken') ?? ''

  async function handleAddPassenger(e: React.FormEvent) {
    e.preventDefault()
    await createPassenger({ tripId: tripId!, body: form })
    setForm({ name: '', phone: '', idCard: '', type: '', note: '' })
    setTab('list')
  }

  async function handleSaveNote(id: string) {
    await updatePassenger({ id, tripId: tripId!, body: { note: editNote } })
    setEditingId(null)
  }

  async function handleSheetGenerate() {
    const res = await sheetSync({ tripId: tripId!, mode: 'GENERATE' }).unwrap()
    setSyncResult(JSON.stringify(res, null, 2))
  }

  async function handleSheetImport(e: React.FormEvent) {
    e.preventDefault()
    const res = await sheetSync({ tripId: tripId!, mode: 'IMPORT', sheetUrl }).unwrap()
    setSyncResult(JSON.stringify(res, null, 2))
  }

  async function handleBulkPaste(e: React.FormEvent) {
    e.preventDefault()
    const lines = bulkText.trim().split('\n').filter(Boolean)
    const parsed = lines.map((line) => {
      const [name = '', phone = '', idCard, type, note] = line.split(/[\t,]/).map((s) => s.trim())
      return { name, phone, ...(idCard && { idCard }), ...(type && { type }), ...(note && { note }) }
    }).filter((p) => p.name && p.phone)

    if (parsed.length === 0) return
    const result = await bulkCreate({ tripId: tripId!, passengers: parsed }).unwrap()
    setSyncResult(`Imported ${result.created} passengers`)
    setBulkText('')
    setTab('list')
  }

  async function handleCsvExport() {
    const r = await fetch(`${apiUrl}/trips/${tripId}/passengers/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passengers-${tripId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Passengers</h2>
          <p className="text-sm text-slate-500 mt-0.5">{passengers.length} registered for this trip</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvExport}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTab('sheet')}>
            <FileSpreadsheet size={14} className="mr-1.5" /> Sheet Sync
          </Button>
          <Button size="sm" onClick={() => setTab(tab === 'add' ? 'list' : 'add')}>
            <Plus size={14} className="mr-1.5" /> Add Passenger
          </Button>
        </div>
      </div>

      {tab === 'add' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Add Passenger (Standalone)</h3>
            <form onSubmit={handleAddPassenger} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone *</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ID Card (CCCD)</label>
                <Input placeholder="Optional" value={form.idCard} onChange={(e) => setForm({ ...form, idCard: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Input placeholder="e.g. KTMT, KHMT, CGC" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Note</label>
                <Input placeholder="Optional note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">Add Passenger</Button>
                <Button type="button" variant="outline" onClick={() => setTab('list')}>Cancel</Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Or paste from spreadsheet (tab/comma separated)</h4>
              <p className="text-xs text-slate-400 mb-2">Format: name, phone, idCard (optional), type (optional), note (optional)</p>
              <form onSubmit={handleBulkPaste} className="space-y-2">
                <textarea
                  className="w-full h-28 text-sm border border-border rounded-md px-3 py-2 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={'Nguyen Van A\t0901234567\t123456789\tKTMT\n' +
                    'Tran Thi B\t0912345678\t\tKHMT\n' +
                    'Le Van C\t0923456789'}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <Button type="submit" variant="outline" size="sm" disabled={!bulkText.trim()}>
                  Import Pasted Data
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'sheet' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Google Sheet Sync</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Mode A — Generate Template</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Get the column structure to create your own sheet
                  </p>
                </div>
                <Button variant="outline" onClick={handleSheetGenerate} disabled={syncing}>
                  <FileSpreadsheet size={14} className="mr-1.5" />
                  Generate Template Info
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Mode B — Import from Link</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paste your Google Sheet URL — columns auto-mapped
                  </p>
                </div>
                <form onSubmit={handleSheetImport} className="flex gap-2">
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="text-sm"
                    required
                  />
                  <Button type="submit" disabled={syncing}>
                    {syncing ? 'Syncing…' : 'Sync'}
                  </Button>
                </form>
              </div>
            </div>
            {syncResult && (
              <pre className="mt-4 text-xs bg-slate-50 border border-border rounded p-3 overflow-auto max-h-40">
                {syncResult}
              </pre>
            )}
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setTab('list')}>
              ← Back to list
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'list' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                {['#', 'Name', 'Phone', 'ID Card', 'Type', 'Note', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {passengers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No passengers yet. Add one above.
                  </td>
                </tr>
              )}
              {passengers.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{p.idCard ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.type ? <Badge variant="secondary">{p.type}</Badge> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveNote(p.id)}>
                          <Check size={12} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="text-slate-500 truncate">{p.note ?? '—'}</span>
                        <Button
                          size="icon" variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { setEditingId(p.id); setEditNote(p.note ?? '') }}
                        >
                          <Pencil size={10} />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => deletePassenger({ id: p.id, tripId: tripId! })}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
