import * as React from 'react'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps {
  icon?: React.ElementType
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Hiển thị khi danh sách/bảng rỗng: icon trôi nhẹ (animate-float) + thông báo + CTA tùy chọn.
 * Toàn khối fade-in khi xuất hiện.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {Icon && (
        <div className="animate-float mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200/70 shadow-inner-highlight">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}
