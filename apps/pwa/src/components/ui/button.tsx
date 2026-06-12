import * as React from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'default' | 'destructive' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'default'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// Nút primary dùng gradient xanh đại dương (sky-500 → sky-700) + bóng màu
const VARIANT: Record<ButtonVariant, string> = {
  primary:     'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-btn hover:shadow-btn-hover hover:brightness-105',
  default:     'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-btn hover:shadow-btn-hover hover:brightness-105',
  secondary:   'bg-gray-100 text-gray-800 hover:bg-gray-200',
  danger:      'bg-gradient-to-b from-danger-500 to-danger-600 text-white shadow-sm hover:brightness-105 focus-visible:ring-danger-500',
  destructive: 'bg-gradient-to-b from-danger-500 to-danger-600 text-white shadow-sm hover:brightness-105 focus-visible:ring-danger-500',
  ghost:       'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800',
  outline:     'bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300',
  link:        'bg-transparent text-primary-600 underline-offset-4 hover:underline',
}

// Kích thước tối ưu cho mobile: md/icon đạt 44px (chuẩn touch target)
const SIZE: Record<ButtonSize, string> = {
  sm:      'h-9 px-3.5 text-sm rounded-xl',
  md:      'h-11 px-5 text-sm font-semibold rounded-xl',
  default: 'h-11 px-5 text-sm font-semibold rounded-xl',
  lg:      'h-12 px-6 text-base font-semibold rounded-xl',
  icon:    'h-11 w-11 rounded-xl',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        // Feedback chạm: active:scale 0.97 + transition 150ms (chỉ transform/màu/bóng — không đổi layout)
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none cursor-pointer',
        'transition-[transform,box-shadow,background-color,border-color,color,opacity,filter] duration-150 ease-out',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
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
