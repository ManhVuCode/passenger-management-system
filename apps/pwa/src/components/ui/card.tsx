import * as React from 'react'
import { cn } from '../../lib/utils'

// Card bo 2xl + đổ bóng mềm nhiều lớp (shadow-card); trang có thể thêm
// "transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card-hover" khi card bấm được
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-2xl border border-gray-200/70 bg-white shadow-card', className)} {...props} />
)
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
)
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold leading-none tracking-tight text-navy-800', className)} {...props} />
)
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)
