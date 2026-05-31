import * as React from 'react'
import { cn } from '../../lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Optional element above the title, e.g. a back link or breadcrumb. */
  leading?: React.ReactNode
  /** Right-aligned actions, e.g. buttons. */
  actions?: React.ReactNode
  className?: string
}

/** Consistent page title block: optional breadcrumb/back + title + subtitle + actions. */
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
