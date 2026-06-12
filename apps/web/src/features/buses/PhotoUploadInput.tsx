import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, X, ImageOff, CheckCircle2, ImagePlus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  label: string
  value: string
  onChange: (base64: string) => void
  required?: boolean
}

/**
 * Ô tải ảnh cao cấp: vùng kéo-thả có phản hồi trực quan khi rê file,
 * preview zoom nhẹ khi hover kèm lớp phủ thao tác, badge xác nhận spring-in
 * và chip nhãn góc chụp ngay trên ảnh. Logic đọc file / validate
 * (loại file, 2MB) giữ nguyên 100%.
 */
export function PhotoUploadInput({ label, value, onChange, required }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Trạng thái chỉ phục vụ hiệu ứng kéo-thả, không ảnh hưởng logic upload
  const [dragging, setDragging] = useState(false)
  const hasImage = value.length > 0

  function handleFile(file: File) {
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Only image files allowed')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File too large (max 2MB recommended)')
      return
    }

    setLoading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      onChange(result)
      setLoading(false)
    }
    reader.onerror = () => {
      setError('Failed to read file')
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    onChange('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
        {label} {required && <span className="text-danger-600">*</span>}
      </label>

      <div
        role={!hasImage ? 'button' : undefined}
        tabIndex={!hasImage ? 0 : undefined}
        aria-label={!hasImage ? label : undefined}
        onKeyDown={(e) => {
          // Hỗ trợ mở hộp chọn file bằng bàn phím khi chưa có ảnh
          if (!hasImage && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'group relative h-36 w-full overflow-hidden rounded-2xl border-2 border-dashed',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2',
          hasImage
            ? 'cursor-default border-transparent shadow-card ring-1 ring-black/5'
            : 'cursor-pointer border-gray-200 bg-gray-50/80 hover:border-primary-400/70 hover:bg-primary-50/40 active:scale-[0.99]',
          dragging &&
            !hasImage &&
            'scale-[1.01] border-primary-500 bg-primary-50/70 ring-4 ring-primary-500/10',
        )}
        onClick={() => !hasImage && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
      >
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm"
            >
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {hasImage ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <img
                src={value}
                alt={label}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />

              {/* Chip nhãn góc chụp — kính mờ navy, luôn hiện trên ảnh */}
              <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-navy-950/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white ring-1 ring-white/15 backdrop-blur-sm">
                {label}
              </span>

              {/* Lớp phủ gradient + nút thao tác: hiện khi hover hoặc focus bàn phím */}
              <div
                className={cn(
                  'absolute inset-0 flex items-end justify-between gap-2 p-3',
                  'bg-gradient-to-t from-navy-950/70 via-navy-950/20 to-transparent',
                  'pointer-events-none opacity-0 transition-opacity duration-200',
                  'group-hover:pointer-events-auto group-hover:opacity-100',
                  'focus-within:pointer-events-auto focus-within:opacity-100',
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    inputRef.current?.click()
                  }}
                  className={cn(
                    'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 text-xs font-semibold text-navy-900 shadow-sm backdrop-blur-sm',
                    'translate-y-1 transition-all duration-200 hover:bg-white group-hover:translate-y-0',
                    'focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
                  )}
                >
                  <Upload size={12} /> Change
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  aria-label="Remove photo"
                  className={cn(
                    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/95 text-navy-900 shadow-sm backdrop-blur-sm',
                    'translate-y-1 transition-all duration-200 hover:bg-danger-50 hover:text-danger-600 group-hover:translate-y-0',
                    'focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/60',
                  )}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Badge xác nhận đã có ảnh — spring scale-in ở góc */}
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.1 }}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 backdrop-blur-sm"
              >
                <CheckCircle2 size={14} className="text-success-600" />
              </motion.span>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5"
            >
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200/80',
                  'transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary-200',
                  dragging && '-translate-y-1 scale-110 shadow-md ring-primary-300',
                )}
              >
                <ImagePlus
                  size={18}
                  className={cn(
                    'text-gray-400 transition-colors duration-200 group-hover:text-primary-600',
                    dragging && 'text-primary-600',
                  )}
                />
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'text-xs font-semibold text-gray-600 transition-colors duration-200 group-hover:text-primary-700',
                    dragging && 'text-primary-700',
                  )}
                >
                  Click or drag to upload
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">JPG, PNG, WEBP · max 2MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-1 text-[11px] font-medium text-danger-600"
          >
            <ImageOff size={11} /> {error}
          </motion.p>
        )}

        {hasImage && !error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-1 text-[10px] font-medium text-success-600"
          >
            <CheckCircle2 size={11} />{' '}
            {t('buses.imageLoaded', { kb: Math.round((value.length * 0.75) / 1024) })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
