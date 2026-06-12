import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
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
  ShieldCheck,
  ArrowRight,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { PageHeader } from '../../components/ui/page-header'
import { MetricCard } from '../../components/ui/metric-card'
import { SectionCard } from '../../components/ui/section-card'
import { EmptyState } from '../../components/ui/empty-state'
import { Skeleton } from '../../components/ui/skeleton'
import { DataTable, type Column } from '../../components/ui/data-table'

/** Định nghĩa một thẻ chỉ số ở hàng đầu trang (để render theo nhịp stagger). */
interface MetricDef {
  key: string
  label: string
  value: number
  icon: LucideIcon
  color: string
  bg: string
  trend?: string
  onClick: () => void
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
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

  // Màu trạng thái tinh gọn theo token (IN_PROGRESS có chấm nhịp đập kiểu "live")
  const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; dot: string; pulse?: boolean }
  > = {
    IN_PROGRESS: {
      label: t('dashboard.statusInProgress'),
      color: 'text-warning-700',
      bg: 'bg-warning-50',
      dot: 'bg-warning-500',
      pulse: true,
    },
    PLANNED: {
      label: t('dashboard.statusPlanned'),
      color: 'text-navy-600',
      bg: 'bg-navy-50',
      dot: 'bg-navy-400',
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

  // Chip ngày hôm nay cạnh tiêu đề (định dạng theo ngôn ngữ đang chọn)
  const today = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Bốn thẻ chỉ số đầu trang — màu lấy từ token, không dùng hex rời
  const metrics: MetricDef[] = [
    {
      key: 'total',
      label: t('dashboard.totalTrips'),
      value: stats.total,
      icon: MapPin,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      onClick: () => navigate('/trips'),
    },
    {
      key: 'active',
      label: t('dashboard.activeTrips'),
      value: stats.active,
      icon: Activity,
      color: 'text-warning-500',
      bg: 'bg-warning-50',
      trend: stats.active > 0 ? t('dashboard.activeTrend', { count: stats.active }) : undefined,
      onClick: () => navigate('/trips?status=IN_PROGRESS'),
    },
    {
      key: 'planned',
      label: t('dashboard.upcomingTrips'),
      value: stats.planned,
      icon: Clock,
      color: 'text-navy-600',
      bg: 'bg-navy-50',
      onClick: () => navigate('/trips?status=PLANNED'),
    },
    {
      key: 'done',
      label: t('dashboard.completedTrips'),
      value: stats.done,
      icon: CheckCircle2,
      color: 'text-success-600',
      bg: 'bg-success-50',
      trend: stats.total > 0 ? t('dashboard.successTrend', { pct: stats.successRate }) : undefined,
      onClick: () => navigate('/trips?status=DONE'),
    },
  ]

  // Phân bố trạng thái cho khối "Tỉ lệ hoàn thành" (chấm màu + thanh tỉ lệ mini)
  const distribution = [
    { label: t('dashboard.statusDone'), value: stats.done, tone: 'bg-success-500' },
    { label: t('dashboard.statusInProgress'), value: stats.active, tone: 'bg-warning-400' },
    { label: t('dashboard.statusPlanned'), value: stats.planned, tone: 'bg-navy-300' },
    { label: t('dashboard.statusCancelled'), value: stats.cancelled, tone: 'bg-danger-500' },
  ]

  // Ba dòng "Đội xe & Nhân sự"
  const fleet = [
    {
      label: t('dashboard.busesInFleet'),
      value: buses.length,
      icon: Bus,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: t('users.admins'),
      value: stats.admins,
      icon: ShieldCheck,
      color: 'text-navy-600',
      bg: 'bg-navy-50',
    },
    {
      label: t('users.drivers'),
      value: stats.drivers,
      icon: Users,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
    },
  ]

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
              'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium ring-1 ring-inset ring-black/[0.05]',
              cfg?.bg,
              cfg?.color,
            )}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {cfg?.pulse && (
                <span
                  className={cn('absolute inset-0 rounded-full animate-ping-soft', cfg?.dot)}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative h-1.5 w-1.5 rounded-full',
                  cfg?.dot,
                  cfg?.pulse && 'animate-pulse-soft',
                )}
              />
            </span>
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
        actions={
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 shadow-inner-highlight">
            <Calendar size={15} className="text-primary-500" aria-hidden="true" />
            <span className="capitalize">{today}</span>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            // Lớp bọc tạo nhịp stagger; bản thân MetricCard tự đếm số + nhấc khi hover
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.06, 0.4) }}
            >
              <MetricCard
                label={m.label}
                value={m.value}
                icon={m.icon}
                color={m.color}
                bg={m.bg}
                trend={m.trend}
                onClick={m.onClick}
                className="h-full"
              />
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <SectionCard title={t('dashboard.successRate')} className="min-h-[180px]">
          <div className="flex items-center gap-7">
            {/* Vòng tròn hoàn thành: vẽ dần bằng pathLength, nét gradient success */}
            <div className="relative h-28 w-28 shrink-0">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <defs>
                  <linearGradient id="dash-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="url(#dash-ring-gradient)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: stats.successRate / 100 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-xl font-bold tabular-nums text-navy-900">
                  {stats.successRate}%
                </span>
              </div>
            </div>

            {/* Chú giải phân bố trạng thái + thanh tỉ lệ mini (scaleX, không đổi layout) */}
            <div className="flex-1 space-y-3">
              {distribution.map((item, i) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', item.tone)} />
                    <span className="font-medium text-gray-600">{item.label}</span>
                    <span className="ml-auto font-display font-bold tabular-nums text-navy-900">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className={cn('h-full rounded-full origin-left', item.tone)}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: stats.total > 0 ? item.value / stats.total : 0 }}
                      transition={{
                        duration: 0.7,
                        ease: [0.16, 1, 0.3, 1],
                        delay: Math.min(0.25 + i * 0.05, 0.4),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t('dashboard.fleetAndTeam')}
          className="min-h-[180px]"
          bodyClassName="p-6 space-y-1.5"
        >
          {fleet.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 + i * 0.06 }}
              className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-gray-50"
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.04] shadow-inner-highlight',
                  'transition-transform duration-200 group-hover:scale-105',
                  item.bg,
                )}
              >
                <item.icon size={17} className={item.color} aria-hidden="true" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-600">{item.label}</span>
              <span className="font-display text-xl font-bold tabular-nums text-navy-900">
                {item.value}
              </span>
            </motion.div>
          ))}
        </SectionCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
      >
        <SectionCard
          title={t('dashboard.recentTrips')}
          headerAction={
            <Link
              to="/trips"
              className="group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 transition-colors duration-150 hover:bg-primary-50 hover:text-primary-700"
            >
              {t('dashboard.viewAll')}
              <ArrowRight
                size={12}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          }
          bodyClassName="p-0"
        >
          <DataTable
            className="rounded-none border-0 shadow-none"
            columns={recentColumns}
            data={stats.recent}
            rowKey={(trip) => trip.id}
            loading={loading}
            onRowClick={(trip) => navigate(`/trips/${trip.id}`)}
            empty={<EmptyState icon={Calendar} title={t('dashboard.noTrips')} />}
          />
        </SectionCard>
      </motion.div>
    </div>
  )
}
