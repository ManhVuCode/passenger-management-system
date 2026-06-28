import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../../store/hooks'
import {
  useGetMyAssignmentsQuery,
  useGetTripsQuery,
  useGetTripQuery,
  useGetPassengersForBusQuery,
  useGetAllocationsByRoundQuery,
  useMarkAttendanceMutation,
  useResetAttendanceMutation,
  type PaxAttendance,
  type RoundAllocation,
} from '../attendance/attendanceApi'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Bus as BusIcon, Clock, Check, X, ChevronRight, WifiOff, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import ProfileDropdown from './ProfileDropdown'

const canMarkStatus = (s: string) => s !== 'CANCELLED'

// ───────────────────── shared bits ─────────────────────
function ThreeState({
  status,
  disabled,
  onSet,
}: {
  status?: string
  disabled?: boolean
  onSet: (next: 'PENDING' | 'JOIN' | 'ABSENT') => void
}) {
  const { t } = useTranslation()
  const isJoin = status === 'JOIN'
  const isAbsent = status === 'ABSENT'
  const isPending = !status
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-gray-200">
      <button
        disabled={disabled}
        onClick={() => onSet('PENDING')}
        aria-label={t('home.pending')}
        className={cn(
          'flex h-11 w-11 items-center justify-center transition-colors disabled:opacity-50',
          isPending ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-400',
        )}
      >
        <Clock size={16} />
      </button>
      <button
        disabled={disabled}
        onClick={() => onSet('JOIN')}
        aria-label={t('status.JOIN')}
        className={cn(
          'flex h-11 w-11 items-center justify-center border-l border-gray-200 transition-colors disabled:opacity-50',
          isJoin ? 'bg-success-600 text-white' : 'bg-white text-gray-400',
        )}
      >
        <Check size={19} strokeWidth={3} />
      </button>
      <button
        disabled={disabled}
        onClick={() => onSet('ABSENT')}
        aria-label={t('status.ABSENT')}
        className={cn(
          'flex h-11 w-11 items-center justify-center border-l border-gray-200 transition-colors disabled:opacity-50',
          isAbsent ? 'bg-warning-500 text-white' : 'bg-white text-gray-400',
        )}
      >
        <X size={19} strokeWidth={3} />
      </button>
    </div>
  )
}

function PaxRow({
  index,
  name,
  phone,
  type,
  status,
  disabled,
  onSet,
}: {
  index: number
  name: string
  phone: string | null
  type?: string | null
  status?: string
  disabled?: boolean
  onSet: (next: 'PENDING' | 'JOIN' | 'ABSENT') => void
}) {
  const isJoin = status === 'JOIN'
  const isAbsent = status === 'ABSENT'
  return (
    <div className="flex items-center gap-3 border-b border-gray-50 px-3 py-2 last:border-0">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isJoin
            ? 'bg-success-100 text-success-700'
            : isAbsent
              ? 'bg-warning-100 text-[#92400e]'
              : 'bg-gray-100 text-gray-600',
        )}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-navy-800">{name}</h4>
        <p className="truncate text-xs text-gray-500">
          {phone || '—'}
          {type ? ` · ${type}` : ''}
        </p>
      </div>
      <ThreeState status={status} disabled={disabled} onSet={onSet} />
    </div>
  )
}

function Counts({ rows }: { rows: { status?: string | null }[] }) {
  const join = rows.filter((r) => r.status === 'JOIN').length
  const absent = rows.filter((r) => r.status === 'ABSENT').length
  const pending = rows.length - join - absent
  return (
    <span className="flex shrink-0 items-center gap-2.5 text-xs font-bold tabular-nums">
      <span className="flex items-center gap-1 text-success-600">
        <Check size={12} /> {join}
      </span>
      <span className="flex items-center gap-1 text-danger-600">
        <X size={12} /> {absent}
      </span>
      <span className="flex items-center gap-1 text-gray-500">
        <Clock size={12} /> {pending}
      </span>
    </span>
  )
}

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
            active === tab.id
              ? 'bg-gradient-to-r from-sky-500 to-primary-600 text-white shadow-sm'
              : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ───────────────────── driver: one bus per round ─────────────────────
function DriverBusList({
  tripId,
  roundId,
  busId,
  canMark,
}: {
  tripId: string
  roundId: string
  busId: string
  canMark: boolean
}) {
  const { t } = useTranslation()
  const { data: pax = [], isLoading } = useGetPassengersForBusQuery({ tripId, roundId, busId })
  const [mark] = useMarkAttendanceMutation()
  const [reset] = useResetAttendanceMutation()

  function set(p: PaxAttendance, next: 'PENDING' | 'JOIN' | 'ABSENT') {
    if (next === 'PENDING') reset({ tripId, roundId, busId, rpaIds: [p.id] })
    else mark({ tripId, roundId, busId, rpaIds: [p.id], status: next })
  }

  if (isLoading) return <p className="px-4 py-8 text-center text-sm text-gray-500">{t('common.loading')}</p>
  if (pax.length === 0)
    return <p className="px-4 py-8 text-center text-sm text-gray-500">{t('home.noPassengers')}</p>

  return (
    <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {t('home.passengers', { count: pax.length })}
        </span>
        <Counts rows={pax.map((p) => ({ status: p.attendanceRecord?.status }))} />
      </div>
      {pax.map((p, i) => (
        <PaxRow
          key={p.id}
          index={i}
          name={p.tripPassengerAssignment.name}
          phone={p.tripPassengerAssignment.phone}
          type={p.tripPassengerAssignment.type}
          status={p.attendanceRecord?.status}
          disabled={!canMark}
          onSet={(next) => set(p, next)}
        />
      ))}
    </div>
  )
}

function DriverView() {
  const { t } = useTranslation()
  const { data: assignments = [], isLoading } = useGetMyAssignmentsQuery()
  const [active, setActive] = useState<string | null>(null)

  if (isLoading) return <p className="p-8 text-center text-sm text-gray-500">{t('home.loadingAssignments')}</p>
  if (assignments.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-500">
          <BusIcon size={30} />
        </div>
        <p className="font-display font-bold text-navy-900">{t('home.emptyTitle')}</p>
        <p className="text-sm text-gray-600">{t('home.emptyBody')}</p>
      </div>
    )

  const activeId = active ?? assignments[0].id
  const a = assignments.find((x) => x.id === activeId) ?? assignments[0]

  return (
    <>
      <Tabs
        tabs={assignments.map((x) => ({ id: x.id, label: x.name }))}
        active={a.id}
        onChange={setActive}
      />
      <div className="px-4 pb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-navy-900">
            <BusIcon size={15} className="shrink-0 text-primary-600" />
            <span className="truncate">
              {a.bus.name} · {a.bus.licensePlate}
            </span>
          </span>
          <Badge variant={a.status as BadgeVariant} label={t(`status.${a.status}`)} />
        </div>
        <DriverBusList
          tripId={a.tripId}
          roundId={a.id}
          busId={a.busId}
          canMark={canMarkStatus(a.status)}
        />
      </div>
    </>
  )
}

// ───────────────────── admin: trip → rounds → buses ─────────────────────
function AdminRoundBuses({
  tripId,
  roundId,
  canMark,
}: {
  tripId: string
  roundId: string
  canMark: boolean
}) {
  const { t } = useTranslation()
  const { data: allocs = [], isLoading } = useGetAllocationsByRoundQuery({ tripId, roundId })
  const [mark] = useMarkAttendanceMutation()
  const [reset] = useResetAttendanceMutation()

  function set(a: RoundAllocation, next: 'PENDING' | 'JOIN' | 'ABSENT') {
    const busId = a.roundBusAssignment?.busId ?? a.busId
    if (next === 'PENDING') reset({ tripId, roundId, busId, rpaIds: [a.id] })
    else mark({ tripId, roundId, busId, rpaIds: [a.id], status: next })
  }

  if (isLoading) return <p className="px-4 py-8 text-center text-sm text-gray-500">{t('common.loading')}</p>
  if (allocs.length === 0)
    return <p className="px-4 py-8 text-center text-sm text-gray-500">{t('home.noPassengers')}</p>

  const byBus = allocs.reduce<Record<string, RoundAllocation[]>>((acc, a) => {
    const bid = a.roundBusAssignment?.busId ?? a.busId
    ;(acc[bid] ??= []).push(a)
    return acc
  }, {})

  return (
    <div className="space-y-4 px-4 pb-6">
      {Object.entries(byBus).map(([busId, rows]) => {
        const bus = rows[0]?.roundBusAssignment?.bus
        return (
          <div key={busId} className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-navy-900">
                <BusIcon size={15} className="shrink-0 text-primary-600" />
                <span className="truncate">
                  {bus?.name ?? `Bus ${busId.slice(0, 6)}`} · {bus?.licensePlate ?? ''}
                </span>
              </span>
              <Counts rows={rows.map((r) => ({ status: r.attendanceRecord?.status }))} />
            </div>
            {rows.map((a, i) => (
              <PaxRow
                key={a.id}
                index={i}
                name={a.tripPassengerAssignment.name}
                phone={a.tripPassengerAssignment.phone}
                type={a.tripPassengerAssignment.type}
                status={a.attendanceRecord?.status}
                disabled={!canMark}
                onSet={(next) => set(a, next)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AdminTripView({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const { t } = useTranslation()
  const { data: trip, isLoading } = useGetTripQuery(tripId)
  const [active, setActive] = useState<string | null>(null)

  if (isLoading || !trip) return <p className="p-8 text-center text-sm text-gray-500">{t('common.loading')}</p>
  const rounds = [...trip.rounds].sort((a, b) => a.sequence - b.sequence)
  if (rounds.length === 0)
    return (
      <div className="p-4">
        <button onClick={onBack} className="mb-4 text-sm font-semibold text-primary-600">
          ← {trip.name}
        </button>
        <p className="py-12 text-center text-sm text-gray-500">{t('home.noRounds')}</p>
      </div>
    )
  const activeId = active ?? rounds[0].id
  const round = rounds.find((r) => r.id === activeId) ?? rounds[0]

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-3">
        <button onClick={onBack} className="text-sm font-bold text-primary-600">
          ←
        </button>
        <span className="truncate text-sm font-bold text-navy-900">{trip.name}</span>
        <Badge variant={round.status as BadgeVariant} label={t(`status.${round.status}`)} />
      </div>
      <Tabs
        tabs={rounds.map((r) => ({ id: r.id, label: r.name }))}
        active={round.id}
        onChange={setActive}
      />
      <AdminRoundBuses tripId={tripId} roundId={round.id} canMark={canMarkStatus(round.status)} />
    </>
  )
}

function AdminView() {
  const { t } = useTranslation()
  const { data: trips = [], isLoading } = useGetTripsQuery()
  const [tripId, setTripId] = useState<string | null>(null)

  if (tripId) return <AdminTripView tripId={tripId} onBack={() => setTripId(null)} />

  if (isLoading) return <p className="p-8 text-center text-sm text-gray-500">{t('common.loading')}</p>
  if (trips.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-500">
          <Users size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('home.noTrips')}</p>
      </div>
    )

  return (
    <div className="space-y-3 p-4">
      <p className="px-1 text-xs font-bold uppercase tracking-widest text-gray-400">
        {t('home.selectTrip')}
      </p>
      {trips.map((trip) => (
        <button
          key={trip.id}
          onClick={() => setTripId(trip.id)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-gray-100 transition active:scale-[0.98]"
        >
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-navy-900">{trip.name}</h3>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={12} className="shrink-0 text-gray-400" />
              {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-gray-300" />
        </button>
      ))}
    </div>
  )
}

// ───────────────────── page shell ─────────────────────
export default function HomePage() {
  const { t } = useTranslation()
  const role = useAppSelector((s) => s.auth.role)
  const isOnline = useOnlineStatus()
  const isDriver = role === 'BUS_MANAGER'

  return (
    <div className="relative mx-auto min-h-screen max-w-[480px] border-x border-gray-200/80 bg-gray-50/40 pb-safe">
      <div className="sticky top-0 z-40">
        <header className="glass pt-safe">
          <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight text-navy-900">
                {isDriver ? t('home.title') : t('home.adminTitle')}
              </h1>
              <p
                className={cn(
                  'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest',
                  isOnline ? 'text-success-700' : 'text-gray-500',
                )}
              >
                {isOnline && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 animate-live-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse-soft" />
                  </span>
                )}
                {isDriver ? t('home.driverSub') : t('home.adminSub')}
              </p>
            </div>
            <ProfileDropdown />
          </div>
        </header>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-warning-500 to-warning-600 px-5 py-2.5 text-[13px] font-bold text-white">
          <WifiOff size={16} className="shrink-0" />
          {t('home.offline')}
        </div>
      )}

      {isDriver ? <DriverView /> : <AdminView />}
    </div>
  )
}
