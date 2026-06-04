import * as React from 'react'
import { cn } from '../../lib/utils'

/** Placeholder khi đang tải. Khớp với hình dạng của nội dung mà nó thay thế. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-gray-100', className)} {...props} />
}
