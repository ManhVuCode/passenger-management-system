import { useRef, useState } from 'react'
import { Upload, X, ImageOff } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  label: string
  value: string
  onChange: (base64: string) => void
  required?: boolean
}

export function PhotoUploadInput({ label, value, onChange, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label} {required && <span className="text-danger-600">*</span>}
      </label>

      <div
        className={cn(
          'relative w-full h-32 rounded-xl border-2 border-dashed overflow-hidden',
          'flex items-center justify-center cursor-pointer transition-all',
          hasImage
            ? 'border-success-600/40 bg-transparent'
            : 'border-gray-200 bg-gray-50 hover:border-primary-600/40 hover:bg-primary-50/30',
        )}
        onClick={() => !hasImage && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {hasImage ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
                className="h-8 px-3 bg-white rounded-lg text-xs font-medium text-gray-950 flex items-center gap-1.5 shadow-sm hover:bg-gray-50"
              >
                <Upload size={12} /> Change
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm hover:bg-danger-50 hover:text-danger-600 transition-colors"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Upload size={18} className="text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500">Click or drag to upload</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP · max 2MB</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && (
        <p className="text-[11px] text-danger-600 flex items-center gap-1">
          <ImageOff size={11} /> {error}
        </p>
      )}

      {hasImage && !error && (
        <p className="text-[10px] text-success-600 font-medium">
          ✓ Image loaded ({Math.round((value.length * 0.75) / 1024)}KB)
        </p>
      )}
    </div>
  )
}
