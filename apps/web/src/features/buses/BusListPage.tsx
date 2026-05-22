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
import { Plus, Trash2, Edit2, Users, Info, X } from 'lucide-react'
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

  if (isLoading) return <div className="p-8 text-gray-400">{t('common.loading')}</div>

  const isEdit = editingBus !== null
  const saving = creating || updating

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">
            {t('buses.title')}
          </h1>
          <p className="text-gray-600 mt-1.5">
            {buses.length === 0
              ? t('buses.none')
              : t('buses.subtitle', { count: buses.length })}
          </p>
        </div>
        <Button className="gap-2 shadow-glow" size="lg" onClick={openCreate}>
          <Plus size={18} />
          {t('buses.registerBus')}
        </Button>
      </header>

      {buses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-16 text-center flex flex-col items-center gap-4">
          <div className="text-primary-600/50">
            <BusPlaceholderSvg className="w-32 h-20" />
          </div>
          <p className="text-gray-400 text-sm">{t('buses.noBuses')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {buses.map((bus) => (
            <BusCard
              key={bus.id}
              bus={bus}
              onDelete={() => deleteBus(bus.id)}
              onEdit={() => openEdit(bus)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 bg-gray-950/20 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ x: 460 }}
              animate={{ x: 0 }}
              exit={{ x: 460 }}
              className="fixed top-0 right-0 bottom-0 w-[460px] bg-white shadow-2xl z-[70] border-l border-gray-100 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-950">
                  {isEdit ? t('buses.editTitle') : t('buses.registerTitle')}
                </h2>
                <button
                  onClick={closePanel}
                  className="p-2 text-gray-400 hover:text-gray-950 rounded-full hover:bg-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col"
              >
                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={`${t('buses.licensePlate')} *`}>
                      <input
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
                          'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium',
                          errors.licensePlate && 'border-danger-600 focus:ring-danger-600/20',
                        )}
                      />
                      {errors.licensePlate && (
                        <p className="text-[11px] text-danger-600">{errors.licensePlate}</p>
                      )}
                    </FormField>
                    <FormField label={`${t('buses.vehicleName')} *`}>
                      <input
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
                          'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium',
                          errors.name && 'border-danger-600 focus:ring-danger-600/20',
                        )}
                      />
                      {errors.name && (
                        <p className="text-[11px] text-danger-600">{errors.name}</p>
                      )}
                    </FormField>
                  </div>

                  <FormField label={`${t('buses.capacity')} *`}>
                    <input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                      required
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
                    />
                  </FormField>

                  <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {t('buses.photos')}
                    </p>

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

                    <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-start gap-3">
                      <Info size={16} className="text-primary-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-primary-600 leading-relaxed font-medium">
                        {t('buses.photosNote')}
                      </p>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100 -mx-6 px-6 -mb-6 pb-6 bg-gray-50/50 sticky bottom-0">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-12 rounded-xl text-md"
                  >
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

function FormField({
  label,
  tone = 'gray-400',
  children,
}: {
  label: string
  tone?: 'gray-400' | 'gray-600'
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest ml-1',
          tone === 'gray-600' ? 'text-gray-600' : 'text-gray-400',
        )}
      >
        {label}
      </label>
      {children}
    </div>
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
      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-gray-100 overflow-hidden group transition-shadow">
        {hasAnyPhoto ? (
          <div className="flex bg-gray-100 h-28 p-1 gap-1">
            {photos.map((photo) => (
              <div key={photo.label} className="flex-1 rounded-lg overflow-hidden bg-gray-200 relative">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <BusPlaceholderSvg className="w-12 h-12" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary-50 via-gray-50 to-primary-100/40 h-28 flex items-center justify-center text-primary-600 relative">
            <BusPlaceholderSvg className="w-20 h-20 opacity-70" />
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold uppercase tracking-widest text-primary-600/70">
              {t('buses.noPhotosYet')}
            </span>
          </div>
        )}
        <div className="p-5 flex justify-between items-center">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-950 truncate">{bus.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {bus.licensePlate}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Users size={12} /> {t('buses.seats', { count: bus.capacity })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              aria-label="Edit bus"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              aria-label="Delete bus"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] z-[80] flex items-center justify-center p-6"
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-danger-600" />
              </div>
              <h3 className="font-bold text-gray-950 mb-1">
                {t('buses.deleteBus', { name: bus.name })}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('buses.deleteConfirm', { plate: bus.licensePlate })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setConfirmDelete(false)
                  }}
                  className="flex-1 h-10 rounded-xl bg-danger-600 text-white text-sm font-medium hover:bg-danger-600/90 active:scale-[0.98] transition-all"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
