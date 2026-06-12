import * as React from 'react'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Phần tử tùy chọn phía trên tiêu đề, ví dụ link quay lại hoặc breadcrumb. */
  leading?: React.ReactNode
  /** Các hành động căn phải, ví dụ các nút. */
  actions?: React.ReactNode
  className?: string
}

/**
 * Khối tiêu đề trang đồng nhất: breadcrumb/back tùy chọn + tiêu đề + phụ đề + hành động.
 * Tự animate khi vào trang (fade + rise). Tiêu đề dạng chuỗi được tô gradient navy→primary
 * bằng font-display; tiêu đề dạng node giữ màu navy đặc để không vỡ màu con.
 */
export function PageHeader({ title, subtitle, leading, actions, className }: PageHeaderProps) {
  const isPlainTitle = typeof title === 'string' || typeof title === 'number'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="min-w-0">
        {leading}
        <h1
          className={cn(
            'font-display text-3xl font-bold tracking-tight truncate pb-0.5',
            isPlainTitle ? 'text-gradient' : 'text-navy-900',
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
          className="flex items-center gap-2 shrink-0"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  )
}
