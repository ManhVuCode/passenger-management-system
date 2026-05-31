import * as React from 'react'
import { motion } from 'motion/react'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface MetricCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  /** text color class for the icon, e.g. 'text-primary-600' */
  color: string
  /** background class for the icon tile, e.g. 'bg-primary-50' */
  bg: string
  trend?: string
  onClick?: () => void
  className?: string
}

/**
 * Single large figure + label + icon tile. Used on Dashboard, Trip and Attendance pages.
 * When `onClick` is provided the card becomes a keyboard-accessible button and reveals
 * an ArrowUpRight affordance on hover.
 */
export function MetricCard({ label, value, icon: Icon, color, bg, trend, onClick, className }: MetricCardProps) {
  const clickable = !!onClick
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'group relative bg-white rounded-2xl p-6 shadow-card ring-1 ring-gray-100 hover:shadow-card-hover transition-shadow',
        clickable &&
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40',
        className,
      )}
    >
      {clickable && (
        <ArrowUpRight
          size={14}
          className="absolute right-4 top-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', bg)}>
        <Icon size={22} className={color} />
      </div>
      <p className="text-3xl font-extrabold text-navy-900 tracking-tight mb-1">{value}</p>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
      {trend && (
        <p className="text-xs text-success-600 font-medium mt-2 flex items-center gap-1">
          <TrendingUp size={11} /> {trend}
        </p>
      )}
    </motion.div>
  )
}
