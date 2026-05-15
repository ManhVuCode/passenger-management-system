import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGetMyAssignmentsQuery } from '../attendance/attendanceApi'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { Bus as BusIcon, Clock, ChevronRight, WifiOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import ProfileDropdown from './ProfileDropdown'

export default function HomePage() {
  const { t } = useTranslation()
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
    <div className="min-h-screen bg-gray-50 max-w-[420px] mx-auto border-x border-gray-200">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-950">{t('home.title')}</h2>
          <p className="text-[10px] font-bold text-success-600 uppercase tracking-widest">
            {t('home.assignment', { count: assignments.length })}
          </p>
        </div>
        <ProfileDropdown />
      </header>

      {!isOnline && (
        <div className="bg-warning-500 text-white px-5 py-1.5 flex items-center gap-2 text-[11px] font-bold">
          <WifiOff size={14} />
          {t('home.offline')}
        </div>
      )}

      <div className="p-4 space-y-3">
        {assignments.length === 0 && (
          <p className="text-center py-16 text-gray-400 text-sm">{t('home.noRounds')}</p>
        )}
        {assignments.map((a) => {
          const isActive = a.status === 'IN_PROGRESS'
          return (
            <Link
              key={`${a.id}-${a.busId}`}
              to={`/trips/${a.trip.id}/rounds/${a.id}/buses/${a.busId}/attendance`}
            >
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'bg-white rounded-2xl shadow-sm border-l-4 p-5 flex items-center gap-4 relative',
                  isActive ? 'border-success-600' : 'border-gray-200',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[200px]">
                      {a.trip.name}
                    </span>
                    <Badge variant={a.status as BadgeVariant} label={t(`status.${a.status}`)} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-950 mb-3 truncate">{a.name}</h3>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                      <BusIcon size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {a.bus.name} · {a.bus.licensePlate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                      <Clock size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {new Date(a.scheduledDep).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        →{' '}
                        {new Date(a.scheduledArr).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {new Date(a.scheduledDep).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 shrink-0" />
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
