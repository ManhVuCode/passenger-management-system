import * as React from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'default' | 'destructive' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'default'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:     'bg-primary-600 text-white hover:bg-primary-600/90 shadow-sm active:scale-[0.98]',
  default:     'bg-primary-600 text-white hover:bg-primary-600/90 shadow-sm active:scale-[0.98]',
  secondary:   'bg-gray-100 text-gray-950 hover:bg-gray-200 active:scale-[0.98]',
  danger:      'bg-danger-600 text-white hover:bg-danger-600/90 active:scale-[0.98]',
  destructive: 'bg-danger-600 text-white hover:bg-danger-600/90 active:scale-[0.98]',
  ghost:       'bg-transparent text-gray-600 hover:bg-gray-100 active:scale-[0.98]',
  outline:     'bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-[0.98]',
  link:        'bg-transparent text-primary-600 underline-offset-4 hover:underline',
}

const SIZE: Record<ButtonSize, string> = {
  sm:      'h-8 px-3 text-sm rounded-lg',
  md:      'h-10 px-4 text-sm font-medium rounded-lg',
  default: 'h-10 px-4 text-sm font-medium rounded-lg',
  lg:      'h-12 px-6 text-base font-medium rounded-xl',
  icon:    'h-10 w-10 rounded-lg',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed',
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
