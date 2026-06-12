import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Placeholder khi đang tải. Khớp với hình dạng của nội dung mà nó thay thế.
 * Hiệu ứng shimmer: vệt sáng quét ngang liên tục trên nền xám nhạt.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-gray-100',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent',
        className,
      )}
      {...props}
    />
  )
}
