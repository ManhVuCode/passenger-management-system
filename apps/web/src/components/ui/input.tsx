import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/* Ô nhập bo xl, viền chuyển mượt khi hover/focus, ring primary mềm */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm',
        'placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200',
        'hover:border-gray-300',
        'focus-visible:outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500/25',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
