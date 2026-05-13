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

const STYLES: Record<BadgeVariant, string> = {
  PLANNED:     'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-warning-50 text-[#92400e] border-l-[3px] border-warning-500 rounded-l-none',
  DONE:        'bg-success-50 text-[#14532d]',
  CANCELLED:   'bg-danger-50 text-[#991b1b]',
  JOIN:        'bg-success-50 text-success-600',
  ABSENT:      'bg-warning-50 text-[#92400e]',
  ADMIN:       'bg-primary-50 text-primary-600',
  BUS_MANAGER: 'bg-[#fff7ed] text-[#c2410c]',
  TYPE_KTMT:   'bg-blue-50 text-blue-600',
  TYPE_KHMT:   'bg-purple-50 text-purple-600',
  TYPE_CGC:    'bg-teal-50 text-teal-600',
  default:     'bg-primary-50 text-primary-600',
  secondary:   'bg-gray-100 text-gray-600',
  success:     'bg-success-50 text-success-600',
  warning:     'bg-warning-50 text-[#92400e]',
  destructive: 'bg-danger-50 text-[#991b1b]',
}

export function Badge({ label, variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'h-[22px] px-2 inline-flex items-center justify-center rounded-full text-[12px] font-medium whitespace-nowrap',
        STYLES[variant] ?? STYLES.default,
        className,
      )}
      {...props}
    >
      {label ?? children}
    </span>
  )
}
