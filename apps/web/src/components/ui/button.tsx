import * as React from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'default' | 'destructive' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'default'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/* Vệt sáng quét ngang khi hover — chỉ dùng cho các nút nền đậm */
const SHINE =
  'before:absolute before:inset-0 before:-translate-x-[150%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-500 before:ease-out hover:before:translate-x-[150%] before:pointer-events-none'

const FILLED_PRIMARY = cn(
  'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-600/20',
  'hover:from-primary-400 hover:to-primary-600 hover:shadow-glow active:scale-[0.97]',
  'focus-visible:ring-primary-500/60',
  SHINE,
)

const FILLED_DANGER = cn(
  'bg-gradient-to-b from-danger-500 to-danger-600 text-white shadow-sm shadow-danger-600/20',
  'hover:brightness-105 hover:shadow-card-hover active:scale-[0.97]',
  'focus-visible:ring-danger-500/60',
  SHINE,
)

const VARIANT: Record<ButtonVariant, string> = {
  primary:     FILLED_PRIMARY,
  default:     FILLED_PRIMARY,
  danger:      FILLED_DANGER,
  destructive: FILLED_DANGER,
  secondary:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-950 hover:ring-gray-300 active:scale-[0.97] focus-visible:ring-primary-500/60',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-950 active:scale-[0.97] focus-visible:ring-primary-500/60',
  outline:
    'bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-950 active:scale-[0.97] focus-visible:ring-primary-500/60',
  link:
    'bg-transparent text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 focus-visible:ring-primary-500/60',
}

const SIZE: Record<ButtonSize, string> = {
  sm:      'h-8 px-3 text-sm rounded-lg',
  md:      'h-10 px-4 text-sm font-medium rounded-xl',
  default: 'h-10 px-4 text-sm font-medium rounded-xl',
  lg:      'h-12 px-6 text-base font-medium rounded-xl',
  icon:    'h-10 w-10 rounded-xl',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        // Base: layout + chuyển động + trạng thái focus/disabled chung
        'relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANT[variant] ?? VARIANT.primary,
        SIZE[size] ?? SIZE.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
