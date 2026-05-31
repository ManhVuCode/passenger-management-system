import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from './button'

export interface ConfirmDialogProps {
  open: boolean
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  error?: string | null
  variant?: 'danger' | 'default'
}

/** Confirmation modal for destructive / irreversible actions. Replaces fire-and-forget. */
export function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel,
  onConfirm, onCancel, loading = false, error, variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card-hover"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              {variant === 'danger' && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-50">
                  <AlertTriangle size={20} className="text-danger-600" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-navy-900">{title}</h2>
                {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
              </div>
            </div>
            {error && (
              <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
