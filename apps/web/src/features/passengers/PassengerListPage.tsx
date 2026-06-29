import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetPassengersQuery,
  useCreatePassengerMutation,
  useUpdatePassengerMutation,
  useDeletePassengerMutation,
  useBulkCreatePassengersMutation,
  type BulkSkip,
} from './passengerApi'
import { useGetAllRoundAllocationsQuery } from '../allocation/allocationApi'
import { importFromSheetUrl, importFromXlsxFile, type ImportResult } from './sheetImporter'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { EmptyState } from '../../components/ui/empty-state'
import { Input } from '../../components/ui/input'
import { PageHeader } from '../../components/ui/page-header'
import { SectionCard } from '../../components/ui/section-card'
import { Skeleton } from '../../components/ui/skeleton'
import {
  Plus,
  Trash2,
  Download,
  RefreshCcw,
  ArrowLeft,
  ArrowRight,
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
  FileSpreadsheet,
  FileUp,
  UserPlus,
  Link2,
  Loader2,
  Send,
  User,
  Phone,
  Mail,
  CreditCard,
  Tag,
  BedDouble,
  StickyNote,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { validateOptionalPhone, validateSimpleText } from '../../lib/validators'

type Tab = 'list' | 'add' | 'sheet'

/* Lớp dùng chung cho ô tiêu đề bảng — header dính với nền mờ, nhãn micro chữ hoa */
const TH =
  'sticky top-0 z-10 border-b border-border bg-gray-50/90 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 backdrop-blur-sm'

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
    email: '',
    idCard: '',
    type: '',
    note: '',
    hotelRoom: '',
  })
  const [errors, setErrors] = useState({ name: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  // Lỗi 409 khi thêm 1 hành khách có SĐT trùng chuyến giao thời gian (chặn cứng).
  const [addError, setAddError] = useState('')
  // Các dòng import bị bỏ qua vì trùng SĐT — báo cáo để admin xử lý.
  const [importSkipped, setImportSkipped] = useState<BulkSkip[]>([])

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const token = localStorage.getItem('accessToken') ?? ''

  // Nạp lại link Google Sheet đã lưu của ĐÚNG chuyến hiện tại — chạy cả khi mount lẫn khi
  // đổi chuyến (route /trips/:tripId/passengers tái dùng cùng component, chỉ đổi tripId).
  // Việc LƯU được làm trực tiếp ở onChange của ô nhập (không qua effect), nên điều hướng
  // giữa các chuyến không bao giờ ghi đè link của chuyến khác.
  useEffect(() => {
    setSheetUrl(tripId ? (localStorage.getItem('mpms-sheet-url:' + tripId) ?? '') : '')
  }, [tripId])

  async function handleAddPassenger(e: React.FormEvent) {
    e.preventDefault()
    const nameErr = validateSimpleText(form.name)
    const phoneErr = validateOptionalPhone(form.phone)
    if (nameErr || phoneErr) {
      setErrors({ name: nameErr, phone: phoneErr })
      return
    }
    setAddError('')
    try {
      await createPassenger({ tripId: tripId!, body: form }).unwrap()
    } catch (err: unknown) {
      // Chặn cứng: SĐT trùng chuyến giao thời gian → server trả 409 kèm thông báo rõ.
      const msg = (err as { data?: { message?: string } })?.data?.message
      setAddError(typeof msg === 'string' ? msg : t('passengers.addFailed'))
      return
    }
    setForm({ name: '', phone: '', email: '', idCard: '', type: '', note: '', hotelRoom: '' })
    setErrors({ name: '', phone: '' })
    setTab('list')
  }

  async function handleSaveNote(id: string) {
    await updatePassenger({ id, tripId: tripId!, body: { note: editNote, email: editEmail } })
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

  // Nhập hành khách từ tệp Excel tải lên — parse tại trình duyệt rồi hiện preview như đồng bộ sheet.
  async function handleXlsxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng một tệp
    if (!file) return
    setImportError('')
    setImportPreview(null)
    setTab('sheet')
    setImporting(true)
    try {
      const result = await importFromXlsxFile(file)
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
    setImportSkipped([])
    try {
      const result = await bulkCreate({
        tripId: tripId!,
        passengers: importPreview.rows,
      }).unwrap()
      setImportPreview(null)
      // Ở lại tab Sheet Sync để link đã nhập vẫn hiển thị (không nhảy đi mất sau khi import).
      setTab('sheet')
      reportImport(result.created, result.skipped)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setImportError(typeof msg === 'string' ? msg : 'Bulk import failed')
    } finally {
      setImporting(false)
    }
  }

  /** Báo kết quả import: toast số đã nhập, và giữ lại danh sách bị bỏ qua (nếu có). */
  function reportImport(created: number, skipped: BulkSkip[]) {
    setImportSkipped(skipped)
    setImportSuccess(
      skipped.length
        ? t('passengers.importedWithSkipped', { count: created, skipped: skipped.length })
        : t('passengers.importedCount', { count: created }),
    )
    setTimeout(() => setImportSuccess(null), 4000)
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
      .filter((p) => p.name)

    if (parsed.length === 0) return
    setImportSkipped([])
    const result = await bulkCreate({ tripId: tripId!, passengers: parsed }).unwrap()
    setBulkText('')
    setTab('list')
    reportImport(result.created, result.skipped)
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
      (p.phone?.toLowerCase().includes(term) ?? false) ||
      (p.email?.toLowerCase().includes(term) ?? false) ||
      (p.idCard?.toLowerCase().includes(term) ?? false)
    )
  })

  // Khung xương shimmer trong lúc tải — giữ bố cục header + bảng để tránh giật layout
  if (isLoading)
    return (
      <div className="p-8" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <div className="border-b border-border bg-gray-50/50 px-4 py-3">
            <Skeleton className="h-9 w-80 rounded-xl" />
          </div>
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    )

  return (
    <div className="p-8">
      <PageHeader
        className="mb-6"
        leading={
          <Link
            to={`/trips/${tripId}`}
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-gray-500 transition-colors duration-150 hover:text-primary-600"
          >
            <ArrowLeft size={13} />
            {t('common.back')}
          </Link>
        }
        title={t('passengers.title')}
        subtitle={t('passengers.subtitle', { count: passengers.length })}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => setTab('sheet')}>
              <RefreshCcw size={16} />
              {t('passengers.sheetSync')}
            </Button>
            <input
              ref={xlsxInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleXlsxFile}
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => xlsxInputRef.current?.click()}
            >
              <FileUp size={16} />
              {t('passengers.importXlsx')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleXlsxExport}>
              <Download size={16} />
              {t('passengers.exportXlsx')}
            </Button>
            <Button className="gap-2" onClick={() => setTab(tab === 'add' ? 'list' : 'add')}>
              <Plus size={18} />
              {t('passengers.addPassenger')}
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {tab === 'sheet' && (
          <motion.div
            key="sheet"
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-card">
              {/* Dải tiêu đề: tile icon gradient + ghi chú quyền truy cập sheet */}
              <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary-50/70 via-sky-50/40 to-transparent px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-navy-900">{t('passengers.sheetSyncTitle')}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                    <Info size={12} className="shrink-0 text-gray-400" />
                    {t('passengers.sheetPublicNote')}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <form onSubmit={handleSheetPreview} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      value={sheetUrl}
                      onChange={(e) => {
                        setSheetUrl(e.target.value)
                        // Lưu ngay theo từng chuyến — link không mất sau khi import / tải lại.
                        if (tripId) localStorage.setItem('mpms-sheet-url:' + tripId, e.target.value)
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      required
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={importing || !sheetUrl.trim()}>
                    {importing ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={14} className="animate-spin" />
                        {t('passengers.reading')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Search size={14} /> {t('passengers.preview')}
                      </span>
                    )}
                  </Button>
                </form>

                <AnimatePresence>
                  {importError && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="flex items-start gap-2.5 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-600"
                    >
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      {importError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {importPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    {/* Các cột nhận diện được — chips xanh vào màn hình theo nhịp stagger */}
                    <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-inset ring-black/[0.03]">
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {t('passengers.detectedColumns')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(importPreview.detectedMapping).map(([col, field], i) => (
                          <motion.span
                            key={col}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.2,
                              ease: 'easeOut',
                              delay: Math.min(i * 0.04, 0.3),
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-2 py-1 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-600/15"
                          >
                            {col}
                            <ArrowRight size={10} className="text-success-600" />
                            {field}
                          </motion.span>
                        ))}
                      </div>
                      {importPreview.skippedColumns.length > 0 && (
                        <p className="mt-2.5 text-xs text-gray-600">
                          {t('passengers.skippedColumnsLabel')}{' '}
                          {importPreview.skippedColumns.join(', ')}
                        </p>
                      )}
                    </div>

                    {importPreview.errors.length > 0 && (
                      <div className="rounded-xl border border-warning-200 bg-warning-50 p-3.5">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning-600">
                          <AlertTriangle size={13} />
                          {t('passengers.skippedRows', { count: importPreview.errors.length })}
                        </p>
                        <ul className="space-y-0.5 text-xs text-[#92400e]">
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
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {t('passengers.previewLabel', { count: importPreview.rows.length })}
                      </p>
                      <div className="max-h-52 overflow-auto rounded-xl border border-border">
                        <table className="w-full border-collapse text-xs">
                          <thead>
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
                                  className="sticky top-0 z-10 border-b border-border bg-gray-50/90 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 backdrop-blur-sm"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importPreview.rows.slice(0, 10).map((row, i) => (
                              <motion.tr
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                                className="transition-colors duration-150 hover:bg-primary-50/40"
                              >
                                <td className="px-3 py-2 font-medium text-navy-900">{row.name}</td>
                                <td className="px-3 py-2 tabular-nums text-gray-600">{row.phone}</td>
                                <td className="px-3 py-2 text-gray-600">{row.type ?? '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{row.hotelRoom ?? '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{row.note ?? '—'}</td>
                              </motion.tr>
                            ))}
                            {importPreview.rows.length > 10 && (
                              <tr>
                                <td colSpan={5} className="px-3 py-2 text-center text-gray-500">
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
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            {t('passengers.importing')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            {t('passengers.importN', { count: importPreview.rows.length })}
                          </span>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setImportPreview(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => setTab('list')}
                  className="cursor-pointer rounded-lg text-[11px] font-semibold uppercase tracking-wider text-gray-500 transition-colors duration-150 hover:text-navy-900"
                >
                  {t('passengers.backToList')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'add' && (
          <motion.div
            key="add"
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              {/* Dải tiêu đề form thêm hành khách */}
              <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary-50/70 via-sky-50/40 to-transparent px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                  <UserPlus size={18} />
                </div>
                <h3 className="font-semibold text-navy-900">
                  {t('passengers.addPassengerTitle')}
                </h3>
              </div>

              <div className="p-6">
                <form
                  onSubmit={handleAddPassenger}
                  className="mb-6 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
                >
                  <AnimatePresence>
                    {addError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-600 sm:col-span-2"
                      >
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                        {addError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <FormField label={`${t('passengers.fullName')} *`}>
                    <FormInput
                      icon={User}
                      value={form.name}
                      onChange={(e) => {
                        const val = e.target.value
                        setForm({ ...form, name: val })
                        setErrors((prev) => ({
                          ...prev,
                          name: val.length > 0 ? validateSimpleText(val) : '',
                        }))
                      }}
                      className={
                        errors.name
                          ? 'border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500/20'
                          : ''
                      }
                      required
                    />
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="mt-1.5 text-[11px] font-medium text-danger-600"
                      >
                        {errors.name}
                      </motion.p>
                    )}
                  </FormField>
                  <FormField label={t('passengers.phone')}>
                    <FormInput
                      icon={Phone}
                      value={form.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '')
                        setForm({ ...form, phone: val })
                        setAddError('')
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
                          ? 'border-success-500 focus-visible:border-success-500 focus-visible:ring-success-500/20'
                          : form.phone.length > 0
                            ? 'border-warning-500 focus-visible:border-warning-500 focus-visible:ring-warning-500/20'
                            : '',
                      )}
                      trailing={
                        form.phone.length === 10 ? (
                          // Dấu tích bật lên bằng spring khi đủ 10 số
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            className="flex text-success-600"
                          >
                            <CheckCircle2 size={15} />
                          </motion.span>
                        ) : undefined
                      }
                    />
                    <div className="mt-1.5 flex items-center justify-between">
                      {errors.phone ? (
                        <p className="text-[11px] font-medium text-danger-600">{errors.phone}</p>
                      ) : (
                        <p className="text-[11px] text-gray-500">{t('passengers.phoneHelp')}</p>
                      )}
                      <p className="text-[11px] tabular-nums text-gray-500">
                        {form.phone.length}/10
                      </p>
                    </div>
                  </FormField>
                  <FormField label={t('passengers.idCard')}>
                    <FormInput
                      icon={CreditCard}
                      placeholder={t('passengers.optional')}
                      value={form.idCard}
                      onChange={(e) => setForm({ ...form, idCard: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t('passengers.type')}>
                    <FormInput
                      icon={Tag}
                      placeholder={t('passengers.typePlaceholder')}
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t('passengers.hotelRoom')}>
                    <FormInput
                      icon={BedDouble}
                      placeholder={t('passengers.hotelRoomPlaceholder')}
                      value={form.hotelRoom}
                      onChange={(e) => setForm({ ...form, hotelRoom: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t('passengers.email')}>
                    <FormInput
                      icon={Mail}
                      type="email"
                      placeholder={t('passengers.emailPlaceholder')}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label={t('passengers.note')}>
                      <FormInput
                        icon={StickyNote}
                        placeholder={t('passengers.notePlaceholder')}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" className="gap-2">
                      <Plus size={16} />
                      {t('passengers.addPassenger')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setTab('list')}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>

                <div className="border-t border-gray-100 pt-6">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <ClipboardList size={13} className="text-gray-400" />
                    {t('passengers.bulkPaste')}
                  </p>
                  <p className="mb-3 text-xs text-gray-600">{t('passengers.bulkFormat')}</p>
                  <form onSubmit={handleBulkPaste} className="space-y-3">
                    <textarea
                      className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 font-mono text-xs text-navy-900 shadow-sm placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                      placeholder={
                        'Nguyen Van A\t0901234567\t123456789\tKTMT\n' +
                        'Tran Thi B\t0912345678\t\tKHMT\n' +
                        'Le Van C\t0923456789'
                      }
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={!bulkText.trim()}
                      className="gap-2"
                    >
                      <Upload size={14} />
                      {t('passengers.importPasted')}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-success-200 bg-success-50 p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600">
              <CheckCircle2 size={15} />
            </span>
            <p className="text-sm font-medium text-success-700">{importSuccess}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importSkipped.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="alert"
            className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-700">
                <AlertTriangle size={13} className="shrink-0" />
                {t('passengers.skippedOverlapTitle', { count: importSkipped.length })}
              </p>
              <button
                onClick={() => setImportSkipped([])}
                aria-label={t('common.close')}
                className="cursor-pointer rounded-lg p-1 text-warning-600 transition-colors duration-150 hover:bg-warning-100"
              >
                <X size={14} />
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-xs text-[#92400e]">
              {importSkipped.slice(0, 8).map((s, i) => (
                <li key={i}>
                  • <span className="font-medium">{s.name}</span> ({s.phone}) — {s.tripName} (
                  {s.dateRange})
                </li>
              ))}
              {importSkipped.length > 8 && (
                <li>{t('passengers.andMoreLines', { count: importSkipped.length - 8 })}</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      >
        <SectionCard bodyClassName="p-0">
          {/* Thanh công cụ: tìm kiếm + lối tắt nhập liệu */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-gray-50/80 to-transparent px-4 py-3">
            <div className="relative w-80 max-w-full">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="text"
                placeholder={t('passengers.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" className="gap-2">
                <Filter size={14} /> {t('passengers.filters')}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setTab('add')}>
                <Upload size={14} /> {t('passengers.bulkImport')}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={TH}>#</th>
                  <th className={TH}>{t('passengers.fullName')}</th>
                  <th className={TH}>{t('passengers.phone')}</th>
                  <th className={TH}>{t('passengers.email')}</th>
                  <th className={TH}>{t('passengers.idCard')}</th>
                  <th className={TH}>{t('passengers.type')}</th>
                  <th className={TH}>{t('passengers.hotelRoom')}</th>
                  {roundSummaries.map((round) => (
                    <RoundColumnHeader key={round.roundId} round={round} />
                  ))}
                  <th className={TH}>{t('passengers.note')}</th>
                  <th className={cn(TH, 'text-right')}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassengers.length === 0 && (
                  <tr>
                    <td colSpan={9 + roundSummaries.length} className="p-0">
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
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: 'easeOut',
                      delay: Math.min(idx * 0.04, 0.4),
                    }}
                    className="group border-b border-border transition-colors duration-150 last:border-0 hover:bg-primary-50/40"
                  >
                    <td className="px-5 py-3.5 text-xs font-semibold tabular-nums text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar chữ cái đầu — tông gradient thương hiệu */}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-primary-600 text-xs font-bold text-white shadow-sm">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-navy-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium tabular-nums">{p.phone || '—'}</span>
                        {p.telegramChatId && (
                          <Badge variant="default" className="gap-1 pl-1.5">
                            <Send size={10} className="shrink-0" />
                            {t('passengers.telegram')}
                          </Badge>
                        )}
                        {p.contactOptOut && (
                          <Badge variant="warning" className="gap-1 pl-1.5">
                            <BellOff size={10} className="shrink-0" />
                            {t('passengers.optedOut')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === p.id ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder={t('passengers.emailPlaceholder')}
                          className="h-8 w-full min-w-[150px] rounded-lg border border-primary-200 bg-white px-2.5 text-xs text-navy-900 shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                        />
                      ) : p.email ? (
                        <span className="text-xs text-gray-600">{p.email}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                      {p.idCard ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.type ? (
                        <Badge variant={`TYPE_${p.type}` as BadgeVariant} label={p.type} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-600">{p.hotelRoom ?? '—'}</td>
                    {roundSummaries.map((round) => {
                      const alloc = round.allocations.find(
                        (a) => a.tripPassengerAssignmentId === p.id,
                      )
                      return (
                        <td key={round.roundId} className="px-5 py-3.5">
                          {alloc ? (
                            <span
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset',
                                alloc.attendanceStatus === 'JOIN'
                                  ? 'bg-success-50 text-success-600 ring-success-600/15'
                                  : alloc.attendanceStatus === 'ABSENT'
                                    ? 'bg-warning-50 text-warning-600 ring-warning-500/20'
                                    : alloc.attendanceStatus === 'CANCELLED'
                                      ? 'bg-danger-50 text-danger-600 ring-danger-500/15'
                                      : 'bg-gray-100 text-gray-500 ring-black/5',
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
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-5 py-3.5">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="h-8 w-full rounded-lg border border-primary-200 bg-white px-2.5 text-xs text-navy-900 shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                          />
                          <button
                            onClick={() => handleSaveNote(p.id)}
                            className="cursor-pointer rounded-lg p-1.5 text-success-600 transition-colors duration-150 hover:bg-success-50"
                            aria-label={t('common.save')}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="cursor-pointer rounded-lg p-1.5 text-danger-600 transition-colors duration-150 hover:bg-danger-50"
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
                            setEditEmail(p.email ?? '')
                          }}
                          className="group/note flex cursor-pointer items-center gap-2 rounded-lg text-left"
                        >
                          <span className="max-w-[140px] truncate text-xs font-medium italic text-gray-600">
                            {p.note || t('passengers.noNotes')}
                          </span>
                          <Edit2
                            size={12}
                            className="shrink-0 text-gray-400 opacity-0 transition-opacity duration-150 group-hover/note:opacity-100"
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          onClick={() => handleToggleOptOut(p)}
                          className={cn(
                            'cursor-pointer rounded-lg p-2 transition-colors duration-150',
                            p.contactOptOut
                              ? 'text-warning-500 hover:bg-warning-50'
                              : 'text-gray-400 hover:bg-warning-50 hover:text-warning-600',
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
                            setEditEmail(p.email ?? '')
                          }}
                          className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors duration-150 hover:bg-primary-50 hover:text-primary-600"
                          aria-label={t('common.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors duration-150 hover:bg-danger-50 hover:text-danger-600"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </motion.div>

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

/* Nhãn trường form: micro-label chữ hoa, đậm vừa, đủ tương phản */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 ml-0.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  )
}

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Icon lucide hiển thị bên trái ô nhập. */
  icon?: LucideIcon
  /** Phần tử nhỏ bên phải ô nhập (ví dụ dấu tích khi hợp lệ). */
  trailing?: React.ReactNode
}

/* Ô nhập của form: viền chuyển mượt khi hover/focus, hỗ trợ icon trái + phần tử phải */
function FormInput({ className, icon: Icon, trailing, ...props }: FormInputProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      )}
      <input
        {...props}
        className={cn(
          'h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-navy-900 shadow-sm',
          'placeholder:font-normal placeholder:text-gray-400',
          'transition-[border-color,box-shadow] duration-200 hover:border-gray-300',
          'focus-visible:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25',
          Icon && 'pl-10',
          trailing && 'pr-10',
          className,
        )}
      />
      {trailing && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</span>
      )}
    </div>
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
      className={cn(TH, 'cursor-pointer select-none')}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <span className="flex items-center gap-1 transition-colors duration-150 hover:text-primary-600">
        {t('passengers.roundShort', { count: round.sequence })}
        <Info size={11} className="text-gray-400" />
      </span>
      {/* Tooltip lộ trình: bật lên bằng spring trên nền navy kính tối */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xl bg-navy-950 px-3 py-2 text-xs normal-case tracking-normal text-white shadow-float ring-1 ring-white/10"
          >
            <p className="font-semibold">{round.roundName}</p>
            <p className="mt-0.5 flex items-center gap-1 font-normal text-navy-300">
              {round.departurePoint}
              <ArrowRight size={10} className="shrink-0" />
              {round.arrivalPoint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </th>
  )
}
