import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetPassengersQuery,
  useCreatePassengerMutation,
  useUpdatePassengerMutation,
  useDeletePassengerMutation,
  useBulkCreatePassengersMutation,
  useSheetSyncMutation,
} from './passengerApi'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import {
  Plus,
  Trash2,
  Download,
  RefreshCcw,
  ArrowLeft,
  Search,
  Check,
  X,
  Edit2,
  Filter,
  Upload,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { validatePhone, validateSimpleText } from '../../lib/validators'

type Tab = 'list' | 'add' | 'sheet'

export default function PassengerListPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { t } = useTranslation()
  const { data: passengers = [], isLoading } = useGetPassengersQuery(tripId!)
  const [createPassenger] = useCreatePassengerMutation()
  const [updatePassenger] = useUpdatePassengerMutation()
  const [deletePassenger] = useDeletePassengerMutation()
  const [bulkCreate] = useBulkCreatePassengersMutation()
  const [sheetSync, { isLoading: syncing }] = useSheetSyncMutation()

  const [tab, setTab] = useState<Tab>('list')
  const [form, setForm] = useState({ name: '', phone: '', idCard: '', type: '', note: '' })
  const [errors, setErrors] = useState({ name: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const token = localStorage.getItem('accessToken') ?? ''

  async function handleAddPassenger(e: React.FormEvent) {
    e.preventDefault()
    const nameErr = validateSimpleText(form.name)
    const phoneErr = validatePhone(form.phone)
    if (nameErr || phoneErr) {
      setErrors({ name: nameErr, phone: phoneErr })
      return
    }
    await createPassenger({ tripId: tripId!, body: form })
    setForm({ name: '', phone: '', idCard: '', type: '', note: '' })
    setErrors({ name: '', phone: '' })
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
    const parsed = lines
      .map((line) => {
        const [name = '', phone = '', idCard, type, note] = line.split(/[\t,]/).map((s) => s.trim())
        return {
          name,
          phone,
          ...(idCard && { idCard }),
          ...(type && { type }),
          ...(note && { note }),
        }
      })
      .filter((p) => p.name && p.phone)

    if (parsed.length === 0) return
    const result = await bulkCreate({ tripId: tripId!, passengers: parsed }).unwrap()
    setSyncResult(t('passengers.importedCount', { count: result.created }))
    setBulkText('')
    setTab('list')
  }

  async function handleXlsxExport() {
    const r = await fetch(`${apiUrl}/trips/${tripId}/passengers/export/xlsx`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passengers-${tripId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredPassengers = passengers.filter((p) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      p.phone.toLowerCase().includes(term) ||
      (p.idCard?.toLowerCase().includes(term) ?? false)
    )
  })

  if (isLoading) return <div className="p-8 text-gray-400">{t('common.loading')}</div>

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            to={`/trips/${tripId}`}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-950 hover:bg-white rounded-full transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-950">{t('passengers.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('passengers.subtitle', { count: passengers.length })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setTab('sheet')}>
            <RefreshCcw size={16} />
            {t('passengers.sheetSync')}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleXlsxExport}>
            <Download size={16} />
            {t('passengers.exportXlsx')}
          </Button>
          <Button className="gap-2" onClick={() => setTab(tab === 'add' ? 'list' : 'add')}>
            <Plus size={18} />
            {t('passengers.addPassenger')}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {tab === 'sheet' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white rounded-2xl shadow-card border border-primary-100 p-6">
              <h3 className="text-sm font-bold text-gray-950 mb-6 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-success-50 text-success-600 flex items-center justify-center">
                  <Download size={14} />
                </div>
                {t('passengers.sheetSyncTitle')}
              </h3>

              <div className="grid grid-cols-2 gap-12">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {t('passengers.modeA')}
                  </p>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">
                      {t('passengers.modeATagline')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleSheetGenerate}
                      disabled={syncing}
                    >
                      {t('passengers.modeAButton')}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {t('passengers.modeB')}
                  </p>
                  <form onSubmit={handleSheetImport} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('passengers.modeBPlaceholder')}
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      required
                      className="flex-1 h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                    />
                    <Button type="submit" size="sm" disabled={syncing}>
                      {syncing ? t('passengers.syncing') : t('passengers.sync')}
                    </Button>
                  </form>
                </div>
              </div>

              {syncResult && (
                <pre className="mt-6 text-[10px] bg-gray-50 border border-gray-100 rounded p-3 overflow-auto max-h-40 font-mono">
                  {syncResult}
                </pre>
              )}
              <button
                onClick={() => setTab('list')}
                className="mt-4 text-[10px] font-bold text-gray-400 hover:text-gray-950 uppercase tracking-widest"
              >
                {t('passengers.backToList')}
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'add' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-950 mb-6">
                {t('passengers.addPassengerTitle')}
              </h3>
              <form onSubmit={handleAddPassenger} className="grid grid-cols-2 gap-4 mb-6">
                <FormField label={`${t('passengers.fullName')} *`}>
                  <FormInput
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm({ ...form, name: val })
                      setErrors((prev) => ({
                        ...prev,
                        name: val.length > 0 ? validateSimpleText(val) : '',
                      }))
                    }}
                    className={errors.name ? 'border-danger-600 focus:ring-danger-600/20' : ''}
                    required
                  />
                  {errors.name && (
                    <p className="text-[11px] text-danger-600 mt-1">{errors.name}</p>
                  )}
                </FormField>
                <FormField label={`${t('passengers.phone')} *`}>
                  <FormInput
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, '')
                      setForm({ ...form, phone: val })
                      setErrors((prev) => ({
                        ...prev,
                        phone:
                          val.length > 0 && val.length !== 10
                            ? t('passengers.phoneDigits', { count: val.length })
                            : '',
                      }))
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0901234567"
                    className={cn(
                      form.phone.length === 10
                        ? 'border-success-600 focus:ring-success-600/20'
                        : form.phone.length > 0
                          ? 'border-warning-500 focus:ring-warning-500/20'
                          : '',
                    )}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.phone ? (
                      <p className="text-[11px] text-danger-600">{errors.phone}</p>
                    ) : (
                      <p className="text-[11px] text-gray-400">{t('passengers.phoneHelp')}</p>
                    )}
                    <p className="text-[11px] text-gray-400">{form.phone.length}/10</p>
                  </div>
                </FormField>
                <FormField label={t('passengers.idCard')}>
                  <FormInput
                    placeholder={t('passengers.optional')}
                    value={form.idCard}
                    onChange={(e) => setForm({ ...form, idCard: e.target.value })}
                  />
                </FormField>
                <FormField label={t('passengers.type')}>
                  <FormInput
                    placeholder={t('passengers.typePlaceholder')}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                </FormField>
                <div className="col-span-2">
                  <FormField label={t('passengers.note')}>
                    <FormInput
                      placeholder={t('passengers.notePlaceholder')}
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button type="submit">{t('passengers.addPassenger')}</Button>
                  <Button type="button" variant="outline" onClick={() => setTab('list')}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {t('passengers.bulkPaste')}
                </p>
                <p className="text-[11px] text-gray-500 mb-3">{t('passengers.bulkFormat')}</p>
                <form onSubmit={handleBulkPaste} className="space-y-3">
                  <textarea
                    className="w-full h-28 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                    placeholder={
                      'Nguyen Van A\t0901234567\t123456789\tKTMT\n' +
                      'Tran Thi B\t0912345678\t\tKHMT\n' +
                      'Le Van C\t0923456789'
                    }
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={!bulkText.trim()}>
                    {t('passengers.importPasted')}
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder={t('passengers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Filter size={14} /> {t('passengers.filters')}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setTab('add')}>
              <Upload size={14} /> {t('passengers.bulkImport')}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                {[
                  '#',
                  t('passengers.fullName'),
                  t('passengers.phone'),
                  t('passengers.idCard'),
                  t('passengers.type'),
                  t('passengers.note'),
                  t('common.actions'),
                ].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100',
                      i === 6 && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-sm">
                    {passengers.length === 0
                      ? t('passengers.noPassengers')
                      : t('passengers.noPassengersFiltered')}
                  </td>
                </tr>
              )}
              {filteredPassengers.map((p, idx) => (
                <tr
                  key={p.id}
                  className={cn(
                    'group transition-all h-14',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20',
                    'hover:bg-primary-50/30',
                  )}
                >
                  <td className="px-6 py-4 text-xs font-bold text-gray-300">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-gray-950 text-sm">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{p.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.idCard ?? '—'}</td>
                  <td className="px-6 py-4">
                    {p.type ? (
                      <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-primary-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                        />
                        <button
                          onClick={() => handleSaveNote(p.id)}
                          className="text-success-600 p-1 hover:bg-success-50 rounded"
                          aria-label={t('common.save')}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-danger-600 p-1 hover:bg-danger-50 rounded"
                          aria-label={t('common.cancel')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(p.id)
                          setEditNote(p.note ?? '')
                        }}
                        className="flex items-center gap-2 cursor-pointer group/note text-left"
                      >
                        <span className="text-xs text-gray-500 truncate max-w-[140px] font-medium italic">
                          {p.note || t('passengers.noNotes')}
                        </span>
                        <Edit2
                          size={12}
                          className="text-gray-300 opacity-0 group-hover/note:opacity-100 transition-opacity"
                        />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 opacity-0 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(p.id)
                          setEditNote(p.note ?? '')
                        }}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label={t('common.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deletePassenger({ id: p.id, tripId: tripId! })}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium',
        className,
      )}
    />
  )
}
