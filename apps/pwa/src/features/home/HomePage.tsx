import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetMyAssignmentsQuery } from '../attendance/attendanceApi'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Bus as BusIcon, Clock, ChevronRight, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import ProfileDropdown from './ProfileDropdown'

// Màu nhấn theo trạng thái round: viền trái + nền phớt gradient (badge dùng component Badge chung)
const STATUS_STYLES: Record<string, { border: string; bg: string }> = {
  PLANNED: {
    border: 'border-l-gray-300',
    bg: 'bg-white',
  },
  IN_PROGRESS: {
    border: 'border-l-warning-500',
    bg: 'bg-gradient-to-br from-warning-50/70 via-white to-white',
  },
  DONE: {
    border: 'border-l-success-600',
    bg: 'bg-gradient-to-br from-success-50/60 via-white to-white',
  },
  CANCELLED: {
    border: 'border-l-danger-600',
    bg: 'bg-gradient-to-br from-danger-50/50 via-white to-white',
  },
}

// Định dạng giờ HH:mm từ chuỗi ISO (giữ nguyên logic gốc)
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: assignments = [], isLoading } = useGetMyAssignmentsQuery()
  const isOnline = useOnlineStatus()

  if (isLoading) {
    return (
      <div className="relative min-h-screen max-w-[420px] mx-auto border-x border-gray-200/80 bg-gray-50/40">
        {/* Lớp aurora xanh đại dương trôi chậm phía sau nội dung */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora animate-aurora" />
        {/* Header giữ nguyên khung khi đang tải để tránh giật layout */}
        <div className="sticky top-0 z-40">
          <header className="glass pt-safe">
            <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight text-navy-900">
                  {t('home.title')}
                </h1>
                <div className="mt-1.5 h-2.5 w-32 rounded-full bg-gray-200 animate-pulse" />
              </div>
              <ProfileDropdown />
            </div>
          </header>
        </div>

        {/* Khung xương 3 thẻ với hiệu ứng rise xen kẽ */}
        <div className="relative p-4 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden animate-rise rounded-2xl bg-white border border-gray-100 border-l-4 border-l-gray-200 shadow-card p-4"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="animate-pulse space-y-3">
                <div className="h-2.5 w-24 rounded-full bg-gray-100" />
                <div className="h-4 w-44 rounded-full bg-gray-200" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 rounded-full bg-gray-100" />
                  <div className="h-6 w-16 rounded-full bg-gray-100" />
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100" />
                <div className="h-3 w-2/3 rounded-full bg-gray-100" />
              </div>
              {/* Vệt sáng quét ngang qua thẻ — skeleton shimmer cao cấp */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent"
              />
            </div>
          ))}
          <p className="pt-4 text-center text-xs font-medium text-gray-600">
            {t('home.loadingAssignments')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen max-w-[420px] mx-auto border-x border-gray-200/80 bg-gray-50/40 pb-safe">
      {/* Lớp aurora xanh đại dương trôi chậm phía sau nội dung */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora animate-aurora" />

      {/* Gợi ý pull-to-refresh (thuần thị giác): viên glass lộ ra khi kéo giãn trang trên mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 flex items-center justify-center"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full glass shadow-float text-primary-500">
          <RefreshCw size={18} className="animate-pulse-soft" />
        </span>
      </div>

      <div className="sticky top-0 z-40">
        <header className="glass pt-safe">
          <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight text-navy-900">
                {t('home.title')}
              </h1>
              <p
                className={cn(
                  'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300',
                  // Phụ đề đổi sắc theo kết nối: xanh "live" khi online, xám trầm khi offline
                  isOnline ? 'text-success-700' : 'text-gray-500',
                )}
              >
                {/* Chấm "live" nhịp thở khi còn kết nối mạng */}
                {isOnline && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 animate-live-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse-soft" />
                  </span>
                )}
                {t('home.assignment', { count: assignments.length })}
              </p>
            </div>
            <ProfileDropdown />
          </div>
        </header>
      </div>

      {/* Banner offline trượt mở/đóng mượt theo trạng thái mạng */}
      <AnimatePresence initial={false}>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative overflow-hidden bg-gradient-to-r from-warning-500 to-warning-600 shadow-md"
          >
            <div className="px-5 py-2.5 flex items-center gap-2.5 text-[13px] font-bold text-white">
              <WifiOff size={16} className="shrink-0" />
              {t('home.offline')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative p-4 space-y-3">
        {assignments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-5">
              {/* Quầng sáng mềm phía sau biểu tượng */}
              <div className="absolute inset-0 rounded-3xl bg-primary-200/60 blur-2xl" aria-hidden="true" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-inset ring-primary-200/60 flex items-center justify-center text-primary-500 animate-float">
                <BusIcon size={36} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <p className="font-display font-bold text-navy-900 mb-1">{t('home.emptyTitle')}</p>
            <p className="text-sm text-gray-600">{t('home.emptyBody')}</p>
          </motion.div>
        ) : (
          assignments.map((a, i) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.PLANNED
            const goToAttendance = () =>
              navigate(`/trips/${a.trip.id}/rounds/${a.id}/buses/${a.busId}/attendance`)
            return (
              <motion.article
                key={`${a.id}-${a.busId}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={goToAttendance}
                  onKeyDown={(e) => {
                    // Cho phép mở bằng bàn phím (Enter/Space) — cùng đích điều hướng với click
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      goToAttendance()
                    }
                  }}
                  aria-label={`${a.name} — ${a.bus.name}`}
                  className={cn(
                    'group rounded-2xl border border-gray-100 border-l-4 shadow-card overflow-hidden',
                    'cursor-pointer select-none transition-[transform,box-shadow] duration-200',
                    'hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    style.border,
                    style.bg,
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate pt-0.5">
                        {a.trip.name}
                      </p>
                      <Badge variant={a.status as BadgeVariant} className="shrink-0 uppercase tracking-wide">
                        {/* Round đang chạy có chấm "live" lan tỏa */}
                        {a.status === 'IN_PROGRESS' && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-warning-500 animate-live-ping" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning-500" />
                          </span>
                        )}
                        {t(`status.${a.status}`)}
                      </Badge>
                    </div>

                    <h3 className="font-display font-bold text-navy-900 text-base leading-tight mb-3">
                      {a.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-4 min-w-0">
                      <span className="flex items-center gap-1.5 bg-white/80 ring-1 ring-inset ring-gray-200 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-700 min-w-0">
                        <BusIcon size={12} className="text-primary-600 shrink-0" aria-hidden="true" />
                        <span className="truncate">{a.bus.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 bg-white/80 ring-1 ring-inset ring-gray-200 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-700 shrink-0 tabular-nums">
                        <Clock size={12} className="text-primary-600 shrink-0" aria-hidden="true" />
                        {formatTime(a.scheduledDep)}
                      </span>
                    </div>

                    {/* Lộ trình dạng timeline dọc: điểm đi → điểm đến kèm giờ dự kiến */}
                    <div className="grid grid-cols-[10px_1fr] gap-x-2.5">
                      <div className="flex flex-col items-center pt-[5px] pb-[5px]">
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-primary-500 bg-white shrink-0" />
                        <span className="w-px flex-1 my-1 border-l border-dashed border-gray-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-navy-700 shrink-0" />
                      </div>
                      <div className="flex flex-col justify-between gap-2.5 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <p className="text-[13px] text-gray-700 font-medium leading-tight truncate">
                            {a.departurePoint}
                          </p>
                          <span className="text-[11px] text-gray-600 tabular-nums shrink-0">
                            {formatTime(a.scheduledDep)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <p className="text-[13px] text-gray-700 font-medium leading-tight truncate">
                            {a.arrivalPoint}
                          </p>
                          <span className="text-[11px] text-gray-600 tabular-nums shrink-0">
                            {formatTime(a.scheduledArr)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-navy-900/[0.03] border-t border-gray-100/80 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-600">
                      {t('home.tapToCheckin')}
                    </span>
                    {/* Mũi tên trong viên tròn phớt xanh — sáng lên và nhích nhẹ khi hover */}
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 transition-[background-color,transform] duration-200 group-hover:bg-primary-100 group-hover:translate-x-0.5"
                    >
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </motion.article>
            )
          })
        )}
      </div>
    </div>
  )
}
