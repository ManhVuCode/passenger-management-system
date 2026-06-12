import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// Input mobile-first: cao 44px, chữ 16px (tránh iOS tự zoom), focus ring mềm lan toả
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-base text-gray-900 shadow-sm',
        'transition-[border-color,box-shadow] duration-200 ease-out',
        'placeholder:text-gray-400',
        'focus-visible:outline-none focus-visible:border-primary-400 focus-visible:ring-4 focus-visible:ring-primary-500/15 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
