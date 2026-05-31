import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetTripsQuery } from '../trips/tripsApi'
import { useGetUsersQuery } from '../users/usersApi'
import { useGetBusesQuery } from '../buses/busApi'
import { useAppSelector } from '../../store/hooks'
import {
  MapPin,
  Activity,
  Clock,
  CheckCircle2,
  Bus,
  Users,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { PageHeader } from '../../components/ui/page-header'
import { MetricCard } from '../../components/ui/metric-card'
import { SectionCard } from '../../components/ui/section-card'
import { EmptyState } from '../../components/ui/empty-state'
import { Skeleton } from '../../components/ui/skeleton'
import { DataTable, type Column } from '../../components/ui/data-table'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: trips = [], isLoading: tripsLoading } = useGetTripsQuery()
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery()
  const { data: buses = [], isLoading: busesLoading } = useGetBusesQuery()
  const name = useAppSelector((s) => s.auth.name)
  const loading = tripsLoading || usersLoading || busesLoading

  const stats = useMemo(() => {
    const total = trips.length
    const active = trips.filter((t) => t.status === 'IN_PROGRESS').length
    const planned = trips.filter((t) => t.status === 'PLANNED').length
    const done = trips.filter((t) => t.status === 'DONE').length
    const cancelled = trips.filter((t) => t.status === 'CANCELLED').length
    const successRate = total > 0 ? Math.round((done / total) * 100) : 0

    const admins = users.filter((u) => u.role === 'ADMIN').length
    const drivers = users.filter((u) => u.role === 'BUS_MANAGER').length

    const recent = [...trips]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5)

    return { total, active, planned, done, cancelled, successRate, admins, drivers, recent }
  }, [trips, users])

  const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; dot: string }
  > = {
    IN_PROGRESS: {
      label: t('dashboard.statusInProgress'),
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      dot: 'bg-warning-500',
    },
    PLANNED: {
      label: t('dashboard.statusPlanned'),
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      dot: 'bg-gray-400',
    },
    DONE: {
      label: t('dashboard.statusDone'),
      color: 'text-success-700',
      bg: 'bg-success-50',
      dot: 'bg-success-600',
    },
    CANCELLED: {
      label: t('dashboard.statusCancelled'),
      color: 'text-danger-600',
      bg: 'bg-danger-50',
      dot: 'bg-danger-600',
    },
  }

  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const greeting = t(`dashboard.greeting.${greetingKey}`)

  const recentColumns: Column<(typeof trips)[number]>[] = [
    {
      key: 'name',
      header: t('dashboard.colTripName'),
      render: (trip) => <span className="font-semibold text-navy-900">{trip.name}</span>,
      sortValue: (trip) => trip.name,
    },
    {
      key: 'start',
      header: t('dashboard.colStart'),
      render: (trip) => new Date(trip.startDate).toLocaleDateString(),
      sortValue: (trip) => new Date(trip.startDate).getTime(),
    },
    {
      key: 'end',
      header: t('dashboard.colEnd'),
      render: (trip) => new Date(trip.endDate).toLocaleDateString(),
      sortValue: (trip) => new Date(trip.endDate).getTime(),
    },
    {
      key: 'status',
      header: t('dashboard.colStatus'),
      render: (trip) => {
        const cfg = STATUS_CONFIG[trip.status as keyof typeof STATUS_CONFIG]
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium',
              cfg?.bg,
              cfg?.color,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg?.dot)} />
            {cfg?.label ?? trip.status}
          </span>
        )
      },
    },
  ]

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title={`${greeting}, ${name?.split(' ').pop() ?? 'Admin'}`}
        subtitle={t('dashboard.subtitle')}
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={t('dashboard.totalTrips')}
            value={stats.total}
            icon={MapPin}
            color="text-primary-600"
            bg="bg-primary-50"
            onClick={() => navigate('/trips')}
          />
          <MetricCard
            label={t('dashboard.activeTrips')}
            value={stats.active}
            icon={Activity}
            color="text-warning-500"
            bg="bg-warning-50"
            trend={stats.active > 0 ? t('dashboard.activeTrend', { count: stats.active }) : undefined}
            onClick={() => navigate('/trips?status=IN_PROGRESS')}
          />
          <MetricCard
            label={t('dashboard.upcomingTrips')}
            value={stats.planned}
            icon={Clock}
            color="text-[#f59e0b]"
            bg="bg-[#fffbeb]"
            onClick={() => navigate('/trips?status=PLANNED')}
          />
          <MetricCard
            label={t('dashboard.completedTrips')}
            value={stats.done}
            icon={CheckCircle2}
            color="text-success-600"
            bg="bg-success-50"
            trend={stats.total > 0 ? t('dashboard.successTrend', { pct: stats.successRate }) : undefined}
            onClick={() => navigate('/trips?status=DONE')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('dashboard.successRate')} className="min-h-[180px]">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeDasharray={`${stats.successRate} ${100 - stats.successRate}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-extrabold text-navy-900">{stats.successRate}%</span>
              </div>
            </div>
            <div className="space-y-2 text-sm flex-1">
              {[
                { label: t('dashboard.statusDone'), value: stats.done, color: 'bg-success-600' },
                { label: t('dashboard.statusInProgress'), value: stats.active, color: 'bg-warning-500' },
                { label: t('dashboard.statusPlanned'), value: stats.planned, color: 'bg-gray-300' },
                { label: t('dashboard.statusCancelled'), value: stats.cancelled, color: 'bg-danger-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
                  <span className="text-gray-600 text-xs">{item.label}</span>
                  <span className="font-bold text-navy-900 ml-auto text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('dashboard.fleetAndTeam')} className="min-h-[180px]" bodyClassName="p-6 space-y-4">
          {[
            { label: t('dashboard.busesInFleet'), value: buses.length, icon: Bus, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: t('users.admins'), value: stats.admins, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: t('users.drivers'), value: stats.drivers, icon: Users, color: 'text-[#c2410c]', bg: 'bg-[#fff7ed]' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.bg)}>
                <item.icon size={16} className={item.color} />
              </div>
              <span className="text-sm text-gray-600 flex-1">{item.label}</span>
              <span className="text-lg font-extrabold text-navy-900">{item.value}</span>
            </div>
          ))}
        </SectionCard>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-navy-900 tracking-tight">{t('dashboard.recentTrips')}</h2>
          <Link
            to="/trips"
            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
          >
            {t('dashboard.viewAll')} <ArrowRight size={12} />
          </Link>
        </div>
        <DataTable
          columns={recentColumns}
          data={stats.recent}
          rowKey={(trip) => trip.id}
          loading={loading}
          onRowClick={(trip) => navigate(`/trips/${trip.id}`)}
          empty={<EmptyState icon={Calendar} title={t('dashboard.noTrips')} />}
        />
      </div>
    </div>
  )
}
