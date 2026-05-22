import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetMyAssignmentsQuery } from '../attendance/attendanceApi'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Bus as BusIcon, Clock, ChevronRight, WifiOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import ProfileDropdown from './ProfileDropdown'

const STATUS_STYLES: Record<
  string,
  { border: string; bg: string; badge: string }
> = {
  PLANNED: {
    border: 'border-l-gray-300',
    bg: 'bg-white',
    badge: 'bg-gray-100 text-gray-600',
  },
  IN_PROGRESS: {
    border: 'border-l-warning-500',
    bg: 'bg-warning-50/40',
    badge: 'bg-warning-50 text-warning-600',
  },
  DONE: {
    border: 'border-l-success-600',
    bg: 'bg-success-50/30',
    badge: 'bg-success-50 text-success-700',
  },
  CANCELLED: {
    border: 'border-l-danger-600',
    bg: 'bg-danger-50/20',
    badge: 'bg-danger-50 text-danger-600',
  },
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: assignments = [], isLoading } = useGetMyAssignmentsQuery()
  const isOnline = useOnlineStatus()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">{t('home.loadingAssignments')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-[420px] mx-auto border-x border-gray-200">
      <div className="sticky top-0 z-40">
        <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
        <header className="bg-white/85 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900 tracking-tight">{t('home.title')}</h2>
            <p className="text-[10px] font-bold text-success-600 uppercase tracking-widest">
              {t('home.assignment', { count: assignments.length })}
            </p>
          </div>
          <ProfileDropdown />
        </header>
      </div>

      {!isOnline && (
        <div className="bg-warning-500 text-white px-5 py-2.5 flex items-center gap-2.5 text-[13px] font-bold shadow-md">
          <WifiOff size={16} />
          {t('home.offline')}
        </div>
      )}

      <div className="p-4 space-y-3">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4 text-gray-300">
              <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" aria-hidden="true">
                <rect
                  x="4"
                  y="20"
                  width="56"
                  height="36"
                  rx="6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <rect
                  x="12"
                  y="10"
                  width="40"
                  height="24"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <circle cx="18" cy="58" r="5" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="46" cy="58" r="5" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <p className="font-bold text-navy-900 mb-1">{t('home.emptyTitle')}</p>
            <p className="text-sm text-gray-500">{t('home.emptyBody')}</p>
          </div>
        ) : (
          assignments.map((a) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.PLANNED
            return (
              <motion.div
                key={`${a.id}-${a.busId}`}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  navigate(`/trips/${a.trip.id}/rounds/${a.id}/buses/${a.busId}/attendance`)
                }
                className={cn(
                  'rounded-2xl border border-gray-100 border-l-4 shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-md',
                  style.border,
                  style.bg,
                )}
              >
                <div className="p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                    {a.trip.name}
                  </p>

                  <h3 className="font-bold text-navy-900 text-base leading-tight mb-3">
                    {a.name}
                  </h3>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1 text-xs font-medium text-gray-700 shrink-0">
                        <BusIcon size={12} className="text-gray-500" />
                        {a.bus.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                        <Clock size={12} className="text-gray-400" />
                        {new Date(a.scheduledDep).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0',
                        style.badge,
                      )}
                    >
                      {t(`status.${a.status}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />
                    <span className="truncate">{a.departurePoint}</span>
                    <span className="text-gray-300">→</span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                    <span className="truncate">{a.arrivalPoint}</span>
                  </div>
                </div>

                <div className="px-4 py-2 bg-black/[0.02] border-t border-gray-100/50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{t('home.tapToCheckin')}</span>
                  <ChevronRight size={12} className="text-gray-400" />
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
