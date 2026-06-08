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
} from './passengerApi'
import { useGetAllRoundAllocationsQuery } from '../allocation/allocationApi'
import { importFromSheetUrl, type SheetRow } from './sheetImporter'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { EmptyState } from '../../components/ui/empty-state'
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
  Info,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Users,
  Bell,
  BellOff,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { validatePhone, validateSimpleText } from '../../lib/validators'

type Tab = 'list' | 'add' | 'sheet'

export default function PassengerListPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { t } = useTranslation()
  const { data: passengers = [], isLoading } = useGetPassengersQuery(tripId!)
  const { data: roundSummaries = [] } = useGetAllRoundAllocationsQuery(tripId!)
  const [createPassenger] = useCreatePassengerMutation()
  const [updatePassenger] = useUpdatePassengerMutation()
  const [deletePassenger] = useDeletePassengerMutation()
  const [bulkCreate] = useBulkCreatePassengersMutation()

  const [tab, setTab] = useState<Tab>('list')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    idCard: '',
    type: '',
    note: '',
    hotelRoom: '',
  })
  const [errors, setErrors] = useState({ name: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    rows: SheetRow[]
    skippedColumns: string[]
    errors: string[]
    detectedMapping: Record<string, string>
  } | null>(null)
  const [importError, setImportError] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

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
    await createPassenger({
      tripId: tripId!,
      body: form,
    })
    setForm({ name: '', phone: '', idCard: '', type: '', note: '', hotelRoom: '' })
    setErrors({ name: '', phone: '' })
    setTab('list')
  }

  async function handleSaveNote(id: string) {
    await updatePassenger({ id, tripId: tripId!, body: { note: editNote } })
    setEditingId(null)
  }

  // D — mô phỏng việc hành khách chủ động từ chối nhận tin (SMS STOP / Telegram opt-out). Được áp dụng khi gửi:
  // hành khách đã opt-out sẽ bị bỏ qua kèm một dòng log OPT_OUT.
  function handleToggleOptOut(p: { id: string; contactOptOut?: boolean }) {
    void updatePassenger({ id: p.id, tripId: tripId!, body: { contactOptOut: !p.contactOptOut } })
  }

  async function handleDeletePassenger() {
    if (!deletingId) return
    await deletePassenger({ id: deletingId, tripId: tripId! })
    setDeletingId(null)
  }

  async function handleSheetPreview(e: React.FormEvent) {
    e.preventDefault()
    setImportError('')
    setImportPreview(null)
    setImporting(true)
    try {
      const result = await importFromSheetUrl(sheetUrl)
      setImportPreview(result)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function handleSheetImport() {
    if (!importPreview) return
    setImporting(true)
    try {
      const result = await bulkCreate({
        tripId: tripId!,
        passengers: importPreview.rows,
      }).unwrap()
      setImportPreview(null)
      setSheetUrl('')
      setTab('list')
      setImportSuccess(t('passengers.importedCount', { count: result.created }))
      setTimeout(() => setImportSuccess(null), 4000)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setImportError(typeof msg === 'string' ? msg : 'Bulk import failed')
    } finally {
      setImporting(false)
    }
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
    await bulkCreate({ tripId: tripId!, passengers: parsed }).unwrap()
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

  const deletingPassenger = passengers.find((p) => p.id === deletingId) ?? null

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
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">{t('passengers.title')}</h1>
            <p className="text-gray-600 mt-1.5">
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
            <div className="bg-white rounded-2xl shadow-card border border-primary-100 p-6 space-y-5">
              <div>
                <h3 className="font-bold text-gray-950 mb-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-success-50 text-success-600 flex items-center justify-center">
                    <Download size={14} />
                  </div>
                  {t('passengers.sheetSyncTitle')}
                </h3>
                <p className="text-xs text-gray-400">{t('passengers.sheetPublicNote')}</p>
              </div>

              <form onSubmit={handleSheetPreview} className="flex gap-2">
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  required
                  className="flex-1 h-10 px-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                />
                <Button type="submit" disabled={importing || !sheetUrl.trim()} size="sm">
                  {importing ? (
                    t('passengers.reading')
                  ) : (
                    <span className="flex items-center gap-1">
                      <Search size={14} /> {t('passengers.preview')}
                    </span>
                  )}
                </Button>
              </form>

              {importError && (
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-sm text-danger-600">
                  {importError}
                </div>
              )}

              {importPreview && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      {t('passengers.detectedColumns')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(importPreview.detectedMapping).map(([col, field]) => (
                        <span
                          key={col}
                          className="px-2 py-1 bg-success-50 text-success-600 rounded-lg text-xs font-medium"
                        >
                          {col} → {field}
                        </span>
                      ))}
                    </div>
                    {importPreview.skippedColumns.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        {t('passengers.skippedColumnsLabel')}{' '}
                        {importPreview.skippedColumns.join(', ')}
                      </p>
                    )}
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="bg-warning-50 border border-warning-500/20 rounded-xl p-3">
                      <p className="text-xs font-bold text-warning-500 mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {t('passengers.skippedRows', { count: importPreview.errors.length })}
                      </p>
                      <ul className="text-xs text-warning-500 space-y-0.5">
                        {importPreview.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                        {importPreview.errors.length > 5 && (
                          <li>
                            {t('passengers.andMoreLines', {
                              count: importPreview.errors.length - 5,
                            })}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      {t('passengers.previewLabel', { count: importPreview.rows.length })}
                    </p>
                    <div className="max-h-48 overflow-auto rounded-xl border border-gray-100">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {[
                              t('passengers.fullName'),
                              t('passengers.phoneShort'),
                              t('passengers.typeShort'),
                              t('passengers.hotelRoom'),
                              t('passengers.note'),
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left font-bold text-gray-400 text-[10px] uppercase tracking-wide"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importPreview.rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{row.name}</td>
                              <td className="px-3 py-2 text-gray-500">{row.phone}</td>
                              <td className="px-3 py-2 text-gray-500">{row.type ?? '—'}</td>
                              <td className="px-3 py-2 text-gray-500">{row.hotelRoom ?? '—'}</td>
                              <td className="px-3 py-2 text-gray-500">{row.note ?? '—'}</td>
                            </tr>
                          ))}
                          {importPreview.rows.length > 10 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-2 text-center text-gray-400">
                                {t('passengers.andMorePassengers', {
                                  count: importPreview.rows.length - 10,
                                })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSheetImport}
                      disabled={importing || importPreview.rows.length === 0}
                      className="flex-1"
                    >
                      {importing ? (
                        t('passengers.importing')
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          {t('passengers.importN', { count: importPreview.rows.length })}
                        </span>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setImportPreview(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setTab('list')}
                className="mt-2 text-[10px] font-bold text-gray-400 hover:text-gray-950 uppercase tracking-widest"
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
                <FormField label={t('passengers.hotelRoom')}>
                  <FormInput
                    placeholder={t('passengers.hotelRoomPlaceholder')}
                    value={form.hotelRoom}
                    onChange={(e) => setForm({ ...form, hotelRoom: e.target.value })}
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

      {importSuccess && (
        <div className="mb-4 p-3 bg-success-50 rounded-xl border border-success-200 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success-600 shrink-0" />
          <p className="text-sm text-success-700 font-medium">{importSuccess}</p>
        </div>
      )}

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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  #
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.fullName')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.phone')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.idCard')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.type')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.hotelRoom')}
                </th>
                {roundSummaries.map((round) => (
                  <RoundColumnHeader key={round.roundId} round={round} />
                ))}
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  {t('passengers.note')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.length === 0 && (
                <tr>
                  <td colSpan={8 + roundSummaries.length} className="p-0">
                    <EmptyState
                      icon={Users}
                      title={
                        passengers.length === 0
                          ? t('passengers.noPassengers')
                          : t('passengers.noPassengersFiltered')
                      }
                    />
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
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{p.phone}</span>
                      {p.telegramChatId && <Badge variant="secondary" label={t('passengers.telegram')} />}
                      {p.contactOptOut && (
                        <Badge variant="warning" label={t('passengers.optedOut')} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.idCard ?? '—'}</td>
                  <td className="px-6 py-4">
                    {p.type ? (
                      <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {p.hotelRoom ?? '—'}
                  </td>
                  {roundSummaries.map((round) => {
                    const alloc = round.allocations.find(
                      (a) => a.tripPassengerAssignmentId === p.id,
                    )
                    return (
                      <td key={round.roundId} className="px-6 py-4">
                        {alloc ? (
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              alloc.attendanceStatus === 'JOIN'
                                ? 'bg-success-50 text-success-600'
                                : alloc.attendanceStatus === 'ABSENT'
                                  ? 'bg-warning-50 text-warning-500'
                                  : alloc.attendanceStatus === 'CANCELLED'
                                    ? 'bg-danger-50 text-danger-600'
                                    : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {alloc.attendanceStatus === 'JOIN' ? (
                              <Check size={14} />
                            ) : alloc.attendanceStatus === 'ABSENT' ? (
                              <X size={14} />
                            ) : (
                              <Minus size={14} />
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
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
                        onClick={() => handleToggleOptOut(p)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          p.contactOptOut
                            ? 'text-warning-500 hover:bg-warning-50'
                            : 'text-gray-400 hover:text-warning-600 hover:bg-warning-50',
                        )}
                        aria-label={t('passengers.toggleOptOut')}
                        title={t('passengers.toggleOptOut')}
                      >
                        {p.contactOptOut ? <BellOff size={16} /> : <Bell size={16} />}
                      </button>
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
                        onClick={() => setDeletingId(p.id)}
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

      <ConfirmDialog
        open={!!deletingId}
        title={t('passengers.deletePassengerTitle')}
        description={
          deletingPassenger
            ? t('passengers.deletePassengerConfirm', { name: deletingPassenger.name })
            : null
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeletePassenger}
        onCancel={() => setDeletingId(null)}
      />
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

function RoundColumnHeader({
  round,
}: {
  round: {
    roundId: string
    roundName: string
    sequence: number
    departurePoint: string
    arrivalPoint: string
  }
}) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <th
      className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer select-none relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <span className="flex items-center gap-1">
        {t('passengers.roundShort', { count: round.sequence })}
        <Info size={11} className="text-gray-400" />
      </span>
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-950 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none normal-case">
          <p className="font-bold mb-0.5">{round.roundName}</p>
          <p className="text-gray-300 font-normal tracking-normal">
            {round.departurePoint} → {round.arrivalPoint}
          </p>
        </div>
      )}
    </th>
  )
}
