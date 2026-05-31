import * as React from 'react'
import { cn } from '../../lib/utils'

/** Loading placeholder. Match the shape of the content it stands in for. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-gray-100', className)} {...props} />
}
