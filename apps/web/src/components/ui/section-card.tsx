import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
  bodyClassName?: string
}

/** Thẻ container với hàng tiêu đề tùy chọn và phần thân có padding. */
export function SectionCard({
  title, subtitle, headerAction, bodyClassName, className, children, ...props
}: SectionCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-white shadow-card', className)} {...props}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-navy-900 truncate">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </div>
  )
}
