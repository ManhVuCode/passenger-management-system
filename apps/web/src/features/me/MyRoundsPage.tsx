import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetMyAssignmentsQuery } from './meApi'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { EmptyState } from '../../components/ui/empty-state'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'
import { Bus as BusIcon, ChevronRight, MapPin, Clock, Route as RouteIcon } from 'lucide-react'

/** Trang chủ của tài xế (BUS_MANAGER): danh sách round được phân công → bấm để điểm danh. */
export default function MyRoundsPage() {
  const { t } = useTranslation()
  const { data: assignments = [], isLoading } = useGetMyAssignmentsQuery()

  return (
    <div className="p-4 sm:p-8">
      <PageHeader className="mb-6" title={t('me.title')} subtitle={t('me.subtitle')} />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
          <EmptyState icon={RouteIcon} title={t('me.noRounds')} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((a) => (
            <Link
              key={`${a.id}-${a.busId}`}
              to={`/me/${a.tripId}/${a.id}/${a.busId}`}
              className="group flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-100 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {a.trip.name}
                </span>
                <Badge variant={a.status as BadgeVariant} label={t(`status.${a.status}`)} />
              </div>
              <h3 className="font-display text-base font-bold text-navy-900">{a.name}</h3>
              {(a.departurePoint || a.arrivalPoint) && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                  <MapPin size={12} className="shrink-0 text-gray-400" />
                  <span className="truncate">
                    {a.departurePoint || '—'} → {a.arrivalPoint || '—'}
                  </span>
                </p>
              )}
              {a.scheduledDep && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} className="shrink-0 text-gray-400" />
                  {new Date(a.scheduledDep).toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between border-t border-gray-50 pt-3">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-primary-700">
                  <BusIcon size={13} className="shrink-0" />
                  <span className="truncate">
                    {a.bus.name} · {a.bus.licensePlate}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-gray-300 group-hover:text-primary-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
