import * as React from 'react'
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

/** Khối tiêu đề trang đồng nhất: breadcrumb/back tùy chọn + tiêu đề + phụ đề + hành động. */
export function PageHeader({ title, subtitle, leading, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        {leading}
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
