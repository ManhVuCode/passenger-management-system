import * as React from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface MetricCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  /** class màu chữ cho icon, ví dụ 'text-primary-600' */
  color: string
  /** class nền cho ô icon, ví dụ 'bg-primary-50' */
  bg: string
  trend?: string
  onClick?: () => void
  className?: string
}

/**
 * Con số đếm tăng dần (count-up) bằng motion/react.
 * Khi giá trị thay đổi (realtime) sẽ đếm từ giá trị cũ sang giá trị mới.
 * Tôn trọng prefers-reduced-motion: hiển thị ngay con số cuối.
 */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const ref = React.useRef<HTMLSpanElement>(null)
  const prev = React.useRef(0)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value
    if (reduce || from === value) {
      node.textContent = String(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, reduce])

  // Render giá trị cuối làm fallback (SSR/khi effect chưa chạy)
  return <span ref={ref}>{value}</span>
}

/**
 * Một con số lớn + nhãn + ô icon. Dùng ở trang Dashboard, Trip và Attendance.
 * Con số dạng number tự động đếm tăng dần (count-up) bằng font-display.
 * Khi truyền `onClick`, thẻ trở thành nút có thể thao tác bằng bàn phím và hiển thị
 * gợi ý ArrowUpRight khi hover.
 */
export function MetricCard({ label, value, icon: Icon, color, bg, trend, onClick, className }: MetricCardProps) {
  const clickable = !!onClick
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
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
        'group relative overflow-hidden bg-white rounded-2xl p-6 shadow-card ring-1 ring-gray-100',
        'hover:shadow-card-hover hover:ring-primary-100 transition-[box-shadow,ring-color] duration-200',
        clickable &&
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40',
        className,
      )}
    >
      {/* Vầng sáng nhẹ góc trên khi hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-100/0 blur-2xl transition-colors duration-300 group-hover:bg-primary-100/60"
      />
      {clickable && (
        <ArrowUpRight
          size={14}
          className="absolute right-4 top-4 text-gray-300 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:text-primary-500"
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner-highlight ring-1 ring-black/[0.03]',
          'transition-transform duration-200 group-hover:scale-105',
          bg,
        )}
      >
        <Icon size={22} className={color} />
      </div>
      <p className="font-display text-3xl font-bold text-navy-900 tracking-tight mb-1 tabular-nums">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
      {trend && (
        <p className="text-xs text-success-600 font-medium mt-2 flex items-center gap-1">
          <TrendingUp size={11} /> {trend}
        </p>
      )}
    </motion.div>
  )
}
