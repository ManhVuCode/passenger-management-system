import * as React from 'react'
import { cn } from '../../lib/utils'

export type BadgeVariant =
  | 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  | 'JOIN' | 'ABSENT'
  | 'ADMIN' | 'BUS_MANAGER'
  | 'TYPE_KTMT' | 'TYPE_KHMT' | 'TYPE_CGC'
  | 'default' | 'secondary' | 'success' | 'warning' | 'destructive'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string
  variant?: BadgeVariant
}

// Màu chữ chọn sắc độ 700+ để đạt tương phản ≥ 4.5:1 trên nền nhạt
const STYLES: Record<BadgeVariant, string> = {
  PLANNED:     'bg-gray-100 text-gray-600 ring-gray-500/20',
  IN_PROGRESS: 'bg-warning-50 text-[#92400e] ring-warning-500/30 border-l-[3px] border-l-warning-500 rounded-l-none',
  DONE:        'bg-success-50 text-[#14532d] ring-success-600/20',
  CANCELLED:   'bg-danger-50 text-[#991b1b] ring-danger-500/20',
  JOIN:        'bg-success-50 text-success-700 ring-success-600/25',
  ABSENT:      'bg-warning-50 text-[#92400e] ring-warning-500/30',
  ADMIN:       'bg-primary-50 text-primary-700 ring-primary-500/25',
  BUS_MANAGER: 'bg-[#fff7ed] text-[#c2410c] ring-[#f97316]/25',
  TYPE_KTMT:   'bg-blue-50 text-blue-700 ring-blue-500/25',
  TYPE_KHMT:   'bg-purple-50 text-purple-700 ring-purple-500/25',
  TYPE_CGC:    'bg-teal-50 text-teal-700 ring-teal-500/25',
  default:     'bg-primary-50 text-primary-700 ring-primary-500/25',
  secondary:   'bg-gray-100 text-gray-600 ring-gray-500/20',
  success:     'bg-success-50 text-success-700 ring-success-600/25',
  warning:     'bg-warning-50 text-[#92400e] ring-warning-500/30',
  destructive: 'bg-danger-50 text-[#991b1b] ring-danger-500/20',
}

export function Badge({ label, variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        // Viền ring-inset mảnh giúp badge nổi rõ trên nền trắng/glass
        'h-[22px] px-2.5 inline-flex items-center justify-center gap-1 rounded-full text-[12px] font-semibold whitespace-nowrap ring-1 ring-inset',
        STYLES[variant] ?? STYLES.default,
        className,
      )}
      {...props}
    >
      {label ?? children}
    </span>
  )
}
