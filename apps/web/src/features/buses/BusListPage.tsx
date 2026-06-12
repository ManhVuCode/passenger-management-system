import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetBusesQuery,
  useCreateBusMutation,
  useUpdateBusMutation,
  useDeleteBusMutation,
} from './busApi'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { MetricCard } from '../../components/ui/metric-card'
import { PageHeader } from '../../components/ui/page-header'
import { EmptyState } from '../../components/ui/empty-state'
import { Skeleton } from '../../components/ui/skeleton'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  Info,
  X,
  Bus as BusIcon,
  Camera,
  Loader2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { PhotoUploadInput } from './PhotoUploadInput'
import { validateLicensePlate, validateSimpleText } from '../../lib/validators'
import type { Bus } from '@pms/shared'

const DEFAULT_FORM = {
  licensePlate: '',
  name: '',
  capacity: 30,
  photoFront: '',
  photoSide: '',
  photoRear: '',
}

export default function BusListPage() {
  const { t } = useTranslation()
  const { data: buses = [], isLoading } = useGetBusesQuery()
  const [createBus, { isLoading: creating }] = useCreateBusMutation()
  const [updateBus, { isLoading: updating }] = useUpdateBusMutation()
  const [deleteBus] = useDeleteBusMutation()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editingBus, setEditingBus] = useState<Bus | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState({ licensePlate: '', name: '' })

  useEffect(() => {
    if (editingBus) {
      setForm({
        licensePlate: editingBus.licensePlate,
        name: editingBus.name,
        capacity: editingBus.capacity,
        photoFront: editingBus.photoFront,
        photoSide: editingBus.photoSide,
        photoRear: editingBus.photoRear,
      })
    }
  }, [editingBus])

  function openCreate() {
    setForm(DEFAULT_FORM)
    setFormError('')
    setErrors({ licensePlate: '', name: '' })
    setEditingBus(null)
    setIsPanelOpen(true)
  }

  function openEdit(bus: Bus) {
    setFormError('')
    setErrors({ licensePlate: '', name: '' })
    setEditingBus(bus)
    setIsPanelOpen(true)
  }

  function closePanel() {
    setIsPanelOpen(false)
    setEditingBus(null)
    setErrors({ licensePlate: '', name: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const plateErr = validateLicensePlate(form.licensePlate)
    const nameErr = validateSimpleText(form.name)
    if (plateErr || nameErr) {
      setErrors({ licensePlate: plateErr, name: nameErr })
      return
    }

    try {
      if (editingBus) {
        await updateBus({ id: editingBus.id, body: form }).unwrap()
      } else {
        await createBus(form).unwrap()
      }
      setForm(DEFAULT_FORM)
      closePanel()
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setFormError(typeof message === 'string' ? message : t('buses.failedSave'))
    }
  }

  // Trạng thái tải: khung xương shimmer khớp đúng hình dạng lưới thẻ xe
  if (isLoading) {
    return (
      <div className="p-8">
        <PageHeader className="mb-8" title={t('buses.title')} subtitle={t('common.loading')} />
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100">
              <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"
            >
              <div className="grid grid-cols-3 gap-1.5 p-1.5">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
              <div className="flex items-center justify-between p-5">
                <div className="space-y-2.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-6 w-56 rounded-full" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isEdit = editingBus !== null
  const saving = creating || updating
  // Số ảnh đã chọn trong form — chỉ phục vụ thanh tiến độ trực quan
  const formPhotos = [form.photoFront, form.photoSide, form.photoRear]
  // Số liệu tổng quan đội xe — tính từ dữ liệu đã tải, chỉ phục vụ hiển thị
  const totalCapacity = buses.reduce((sum, bus) => sum + bus.capacity, 0)
  const totalPhotos = buses.reduce(
    (sum, bus) => sum + [bus.photoFront, bus.photoSide, bus.photoRear].filter(Boolean).length,
    0,
  )

  return (
    <div className="p-8">
      <PageHeader
        className="mb-8"
        title={t('buses.title')}
        subtitle={
          buses.length === 0 ? t('buses.none') : t('buses.subtitle', { count: buses.length })
        }
        actions={
          <Button className="gap-2 shadow-glow" size="lg" onClick={openCreate}>
            <Plus size={18} />
            {t('buses.registerBus')}
          </Button>
        }
      />

      {buses.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-6 shadow-card">
          <EmptyState
            icon={BusIcon}
            title={t('buses.noBuses')}
            action={
              <Button className="gap-2" onClick={openCreate}>
                <Plus size={16} />
                {t('buses.registerBus')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Dải số liệu đội xe: số đếm tự chạy (count-up) bằng MetricCard */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label={t('nav.buses')}
              value={buses.length}
              icon={BusIcon}
              color="text-primary-600"
              bg="bg-primary-50"
            />
            <MetricCard
              label={t('buses.capacity')}
              value={totalCapacity}
              icon={Users}
              color="text-success-600"
              bg="bg-success-50"
            />
            <MetricCard
              label={t('buses.photos')}
              value={totalPhotos}
              icon={Camera}
              color="text-warning-600"
              bg="bg-warning-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {/* popLayout: thẻ bị xoá co lại mượt, các thẻ còn lại tự dồn chỗ */}
            <AnimatePresence mode="popLayout">
              {buses.map((bus, i) => (
                <motion.div
                  key={bus.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: { duration: 0.18, ease: 'easeIn' },
                  }}
                  transition={{
                    opacity: { duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) },
                    y: { duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) },
                    scale: { duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) },
                    layout: { type: 'spring', stiffness: 350, damping: 32 },
                  }}
                >
                  <BusCard
                    bus={bus}
                    onDelete={() => deleteBus(bus.id)}
                    onEdit={() => openEdit(bus)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closePanel}
              className="fixed inset-0 z-[60] bg-navy-950/45 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed bottom-0 right-0 top-0 z-[70] flex w-[480px] max-w-full flex-col border-l border-gray-100 bg-white shadow-float"
            >
              {/* Header panel: ô icon gradient + tiêu đề font-display */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
                    <BusIcon size={18} />
                  </div>
                  <h2 className="font-display text-lg font-bold text-navy-900">
                    {isEdit ? t('buses.editTitle') : t('buses.registerTitle')}
                  </h2>
                </div>
                <button
                  onClick={closePanel}
                  aria-label={t('common.close')}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={`${t('buses.licensePlate')} *`}>
                      <Input
                        placeholder={t('buses.licensePlatePlaceholder')}
                        value={form.licensePlate}
                        onChange={(e) => {
                          const val = e.target.value
                          setForm({ ...form, licensePlate: val })
                          setErrors((prev) => ({
                            ...prev,
                            licensePlate: val.length > 0 ? validateLicensePlate(val) : '',
                          }))
                        }}
                        required
                        className={cn(
                          'h-11 font-medium',
                          errors.licensePlate &&
                            'border-danger-400 focus-visible:border-danger-400 focus-visible:ring-danger-500/25',
                        )}
                      />
                      <FieldError message={errors.licensePlate} />
                    </FormField>
                    <FormField label={`${t('buses.vehicleName')} *`}>
                      <Input
                        placeholder={t('buses.vehicleNamePlaceholder')}
                        value={form.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setForm({ ...form, name: val })
                          setErrors((prev) => ({
                            ...prev,
                            name: val.length > 0 ? validateSimpleText(val) : '',
                          }))
                        }}
                        required
                        className={cn(
                          'h-11 font-medium',
                          errors.name &&
                            'border-danger-400 focus-visible:border-danger-400 focus-visible:ring-danger-500/25',
                        )}
                      />
                      <FieldError message={errors.name} />
                    </FormField>
                  </div>

                  <FormField label={`${t('buses.capacity')} *`}>
                    <div className="relative">
                      <Users
                        size={15}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                        required
                        className="h-11 pl-10 font-semibold tabular-nums"
                      />
                    </div>
                  </FormField>

                  <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                        {t('buses.photos')}
                      </p>
                      {/* Thanh tiến độ 3 đoạn: sáng dần khi từng ảnh được chọn */}
                      <div className="flex items-center gap-1" aria-hidden="true">
                        {formPhotos.map((photo, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              'h-1.5 w-5 rounded-full transition-colors duration-300',
                              photo ? 'bg-primary-500' : 'bg-gray-200',
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <PhotoUploadInput
                      label={t('buses.frontView')}
                      value={form.photoFront}
                      onChange={(b64) => setForm({ ...form, photoFront: b64 })}
                    />
                    <PhotoUploadInput
                      label={t('buses.sideView')}
                      value={form.photoSide}
                      onChange={(b64) => setForm({ ...form, photoSide: b64 })}
                    />
                    <PhotoUploadInput
                      label={t('buses.rearView')}
                      value={form.photoRear}
                      onChange={(b64) => setForm({ ...form, photoRear: b64 })}
                    />

                    <div className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/70 p-4">
                      <Info size={15} className="mt-0.5 shrink-0 text-primary-600" />
                      <p className="text-[11px] font-medium leading-relaxed text-primary-700">
                        {t('buses.photosNote')}
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {formError && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600"
                      >
                        {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border-t border-gray-100 bg-gray-50/80 p-5">
                  <Button type="submit" disabled={saving} size="lg" className="w-full gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {saving
                      ? isEdit
                        ? t('buses.saving')
                        : t('buses.registering')
                      : isEdit
                        ? t('buses.saveChanges')
                        : t('buses.saveRegistration')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
        {label}
      </label>
      {children}
    </div>
  )
}

/* Thông báo lỗi từng ô nhập — trượt nhẹ xuống khi xuất hiện */
function FieldError({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="text-[11px] font-medium text-danger-600"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function BusPlaceholderSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="10"
        y="30"
        width="180"
        height="60"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="20"
        y="20"
        width="120"
        height="35"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="45" cy="92" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="155" cy="92" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="30" y="28" width="20" height="20" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="58" y="28" width="20" height="20" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="86" y="28" width="20" height="20" rx="2" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

interface BusCardProps {
  bus: Bus
  onDelete: () => void
  onEdit: () => void
}

function BusCard({ bus, onDelete, onEdit }: BusCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const photos = [
    { url: bus.photoFront, label: t('buses.frontView') },
    { url: bus.photoSide, label: t('buses.sideView') },
    { url: bus.photoRear, label: t('buses.rearView') },
  ]
  const hasAnyPhoto = photos.some((p) => p.url)

  return (
    <>
      <div className="group h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary-100 hover:shadow-card-hover">
        {hasAnyPhoto ? (
          /* Dải ảnh kiểu phim âm bản: khung navy tối, ảnh zoom + hiện nhãn góc chụp khi hover */
          <div className="relative grid grid-cols-3 gap-1.5 overflow-hidden bg-navy-950 p-1.5">
            {photos.map((photo) => (
              <div
                key={photo.label}
                className="group/photo relative h-28 overflow-hidden rounded-xl bg-navy-900"
              >
                {photo.url ? (
                  <>
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/photo:scale-[1.07]"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/75 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover/photo:opacity-100">
                      <span className="translate-y-1 text-[9px] font-bold uppercase tracking-widest text-white transition-transform duration-200 group-hover/photo:translate-y-0">
                        {photo.label}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-navy-600">
                    <BusPlaceholderSvg className="h-10 w-10" />
                  </div>
                )}
              </div>
            ))}
            {/* Vệt sáng quét chéo qua dải ảnh khi hover thẻ — chất Linear, chỉ dùng transform */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-[500%]"
            />
            {/* 3 chấm chỉ báo ảnh đã có — chip kính mờ ở góc */}
            <div
              className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-navy-950/55 px-2 py-1.5 ring-1 ring-white/15 backdrop-blur-sm"
              aria-hidden="true"
            >
              {photos.map((photo) => (
                <span
                  key={photo.label}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    photo.url ? 'bg-sky-400' : 'bg-white/25',
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative flex h-[124px] items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-sky-50 text-primary-500">
            <BusPlaceholderSvg className="h-20 w-20 opacity-60 transition-transform duration-300 ease-out group-hover:scale-105" />
            <span className="absolute bottom-2 right-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary-600">
              <Camera size={10} aria-hidden="true" />
              {t('buses.noPhotosYet')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-navy-900">{bus.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Biển số kiểu tấm biển xe thật: nền navy, chữ mono */}
              <span className="inline-flex items-center rounded-md bg-navy-900 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-white shadow-sm ring-1 ring-navy-700">
                {bus.licensePlate}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">
                <Users size={12} aria-hidden="true" />
                {t('buses.seats', { count: bus.capacity })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={onEdit}
              aria-label={t('common.edit')}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 active:scale-95"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label={t('common.delete')}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/50 active:scale-95"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('buses.deleteBus', { name: bus.name })}
        description={t('buses.deleteConfirm', { plate: bus.licensePlate })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          onDelete()
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
