import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetPassengersForBusQuery,
  useMarkAttendanceMutation,
  useUpdateRoundStatusMutation,
} from './attendanceApi'
import { useAttendanceSocket, type AttendanceUpdate } from '../../hooks/useAttendanceSocket'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Button } from '../../components/ui/button'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import {
  ArrowLeft,
  Check,
  X,
  Search,
  Bell,
  WifiOff,
  Megaphone,
  CheckCircle2,
  Users,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { cn } from '../../lib/utils'

// Khối skeleton có lớp shimmer quét ngang — chỉ dùng cho trạng thái đang tải
function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden bg-gray-200/70', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

// Số liệu lớn đếm tăng mượt bằng spring — đếm từ 0 khi vào trang,
// nhảy mượt khi cập nhật realtime/optimistic (reduced-motion đã xử lý toàn cục)
function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 170, damping: 26 })
  const text = useTransform(spring, (v) => String(Math.round(v)))
  useEffect(() => {
    spring.set(value)
  }, [spring, value])
  return <motion.span>{text}</motion.span>
}

export default function AttendancePage() {
  const { tripId, roundId, busId } = useParams<{
    tripId: string
    roundId: string
    busId: string
  }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: passengers = [], isLoading } = useGetPassengersForBusQuery({
    tripId: tripId!,
    roundId: roundId!,
    busId: busId!,
  })
  // Số liệu phạm vi XE NÀY (danh sách hành khách của xe) — summary của API là
  // toàn round (mọi xe) nên không dùng ở đây kẻo tài xế hiểu nhầm
  const busStats = useMemo(() => {
    let join = 0
    let absent = 0
    let cancelled = 0
    for (const p of passengers) {
      const s = p.attendanceRecord?.status
      if (s === 'JOIN') join++
      else if (s === 'ABSENT') absent++
      else if (s === 'CANCELLED') cancelled++
    }
    const total = passengers.length
    return { total, join, absent, cancelled, pending: total - join - absent - cancelled }
  }, [passengers])
  const [markAttendance, { isLoading: marking }] = useMarkAttendanceMutation()
  const [updateRoundStatus, { isLoading: completing }] = useUpdateRoundStatusMutation()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [peerUpdate, setPeerUpdate] = useState<string | null>(null)
  const [broadcastAlert, setBroadcastAlert] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  useAttendanceSocket({
    tripId,
    onAttendanceUpdate: useCallback(
      (data: AttendanceUpdate) => {
        if (data.busId !== busId) {
          const time = new Date(data.markedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          setPeerUpdate(
            t('attendance.peerUpdate', {
              bus: data.busId.slice(0, 6),
              name: data.passengerName,
              status: t(`status.${data.status}` as const),
              time,
            }),
          )
          window.setTimeout(() => setPeerUpdate(null), 4000)
        }
      },
      [busId, t],
    ),
    onBroadcastAlert: useCallback((msg: string) => setBroadcastAlert(msg), []),
  })

  // Các lần điểm danh khi offline không gửi đến được server nhưng được service worker
  // xếp hàng và phát lại khi kết nối trở lại — banner offline đã báo điều đó rồi nên ta
  // giữ im lặng. Chỉ khi server thực sự từ chối mới hiển thị lỗi.
  function surfaceMarkError(err: unknown) {
    const e = err as { status?: unknown; data?: { message?: string } }
    if (e.status === 'FETCH_ERROR' || e.status === 'TIMEOUT_ERROR') return
    const msg = e.data?.message
    setMarkError(typeof msg === 'string' ? msg : t('attendance.failedMark'))
    window.setTimeout(() => setMarkError(null), 4000)
  }

  async function handleMark(rpaId: string, status: 'JOIN' | 'ABSENT') {
    setMarkError(null)
    try {
      await markAttendance({
        tripId: tripId!,
        roundId: roundId!,
        busId: busId!,
        rpaIds: [rpaId],
        status,
      }).unwrap()
    } catch (err) {
      surfaceMarkError(err)
    }
  }

  async function handleMarkAll(status: 'JOIN' | 'ABSENT') {
    const all = passengers.map((p) => p.id)
    if (!all.length) return
    setMarkError(null)
    try {
      await markAttendance({
        tripId: tripId!,
        roundId: roundId!,
        busId: busId!,
        rpaIds: all,
        status,
      }).unwrap()
    } catch (err) {
      surfaceMarkError(err)
    }
  }

  async function handleComplete() {
    setCompleteError(null)
    try {
      await updateRoundStatus({
        tripId: tripId!,
        roundId: roundId!,
        status: 'DONE',
      }).unwrap()
      setShowConfirm(false)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setCompleteError(typeof msg === 'string' ? msg : t('attendance.failedComplete'))
    }
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-gray-50 max-w-[420px] mx-auto border-x border-gray-200 overflow-hidden">
        {/* Skeleton mô phỏng đúng bố cục thật: header + hàng hành khách, quét shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-aurora animate-aurora"
        />
        <div className="relative">
          <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
          <div className="glass pt-safe border-b border-gray-200/60 px-4 pb-4">
            <div className="h-14 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-2.5 w-20 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0, 1, 2].map((k) => (
                <Skeleton key={k} className="h-12 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <div className="px-4 pt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <div className="mt-3">
            {[0, 1, 2, 3, 4].map((k) => (
              <div key={k} className="flex items-center gap-3.5 px-4 py-4 border-b border-gray-100">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3 rounded-md" />
                  <Skeleton className="h-2.5 w-1/3 rounded-md" />
                </div>
                <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
              </div>
            ))}
          </div>
          <p className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            {t('attendance.loadingPassengers')}
          </p>
        </div>
      </div>
    )
  }

  const someMarked = passengers.some((p) => p.attendanceRecord)
  // Tránh chia cho 0 khi tính phần trăm thanh tiến độ
  const totalSafe = Math.max(busStats.total, 1)

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col max-w-[420px] mx-auto border-x border-gray-200">
      {/* Lớp aurora xanh đại dương trôi nhẹ phía sau header — thuần trang trí */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-aurora animate-aurora"
      />

      {/* ── Modal cảnh báo broadcast từ Admin ───────────────────────────── */}
      <AnimatePresence>
        {broadcastAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-white rounded-3xl p-7 w-full max-w-[320px] text-center relative z-10 shadow-float"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-50 ring-1 ring-primary-500/15 flex items-center justify-center mx-auto mb-5">
                <Megaphone className="h-7 w-7 text-primary-600 animate-success-pop" />
              </div>
              <h3 className="font-display text-lg font-bold tracking-tight text-navy-800 mb-2">
                {t('attendance.broadcastAlert')}
              </h3>
              <p className="text-sm text-gray-600 mb-7 leading-relaxed whitespace-pre-line">
                {broadcastAlert}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => setBroadcastAlert(null)}
              >
                {t('common.gotIt')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header dính: tiêu đề + chấm live + tổng kết tiến độ ─────────── */}
      <header className="sticky top-0 z-40 flex flex-col">
        <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600" />
        <div className="glass pt-safe border-b border-gray-200/60">
          <div className="h-14 px-3 flex items-center gap-1">
            <Link
              to="/"
              className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-navy-800 hover:bg-gray-100/80 transition-colors duration-150 active:scale-[0.95]"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0 px-1">
              <h2 className="font-display text-base font-bold tracking-tight text-navy-800 truncate leading-tight">
                {t('attendance.title')}
              </h2>
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {/* Chấm trạng thái realtime: xanh = socket live, vàng = offline */}
                <span className="relative flex h-2 w-2 shrink-0">
                  {isOnline && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 animate-live-ping" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      isOnline ? 'bg-success-500 animate-pulse-soft' : 'bg-warning-500',
                    )}
                  />
                </span>
                {t('attendance.seats', { count: busStats.total })}
              </p>
            </div>
            <button
              className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-navy-800 hover:bg-gray-100/80 transition-colors duration-150 active:scale-[0.95]"
              aria-label={t('common.search')}
            >
              <Search size={20} />
            </button>
          </div>

          {busStats.total > 0 && (
            <div className="px-4 pb-3">
              {/* Ba số liệu lớn đếm tăng động (font-display + tabular-nums) */}
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                {(
                  [
                    {
                      value: busStats.join,
                      label: t('status.JOIN'),
                      dot: 'bg-success-500',
                      text: 'text-success-700',
                    },
                    {
                      value: busStats.absent,
                      label: t('status.ABSENT'),
                      dot: 'bg-warning-500',
                      text: 'text-[#b45309]',
                    },
                    {
                      value: busStats.pending,
                      label: t('status.PENDING'),
                      dot: 'bg-gray-300',
                      text: 'text-navy-700',
                    },
                  ] as const
                ).map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span
                      className={cn(
                        'font-display text-2xl font-bold tabular-nums leading-tight',
                        s.text,
                      )}
                    >
                      <AnimatedNumber value={s.value} />
                    </span>
                  </div>
                ))}
              </div>
              {/* Thanh tiến độ phân đoạn — width chạy spring khi điểm danh.
                  Phần xám còn lại = PENDING; đoạn đỏ chỉ xuất hiện khi có CANCELLED */}
              <div className="flex h-2 rounded-full bg-gray-200/80 ring-1 ring-inset ring-navy-900/5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-success-500 to-success-600"
                  animate={{ width: `${(busStats.join / totalSafe) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-warning-500 to-warning-600"
                  animate={{ width: `${(busStats.absent / totalSafe) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-danger-500 to-danger-600"
                  animate={{ width: `${(busStats.cancelled / totalSafe) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Banner offline: các lần điểm danh được xếp hàng chờ đồng bộ ─── */}
      <AnimatePresence initial={false}>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative overflow-hidden bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-md"
          >
            {/* Sọc chéo mờ kiểu băng cảnh báo — thuần trang trí */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.09)_0_10px,transparent_10px_20px)]"
            />
            <div className="relative px-4 py-2.5 flex items-center gap-2.5 text-[13px] font-semibold">
              <span className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <WifiOff size={15} className="shrink-0" />
              </span>
              <span className="flex-1">{t('attendance.offline')}</span>
              <span className="h-2 w-2 rounded-full bg-white/90 animate-pulse-soft shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Banner lỗi khi server từ chối lần điểm danh ─────────────────── */}
      <AnimatePresence>
        {markError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-danger-500 to-danger-600 text-white shadow-md"
          >
            <div className="px-4 py-2.5 flex items-center gap-2.5 text-[13px] font-semibold">
              <AlertTriangle size={15} className="shrink-0" />
              {markError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dòng cập nhật realtime từ xe khác (WebSocket) ───────────────── */}
      <AnimatePresence>
        {peerUpdate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden bg-primary-50 border-b border-primary-100"
          >
            <p className="px-4 py-2 text-[11px] font-semibold text-primary-700 flex items-center gap-2">
              <Bell size={12} className="shrink-0 animate-pulse-soft" />
              <span className="truncate">{peerUpdate}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hành động hàng loạt ─────────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-2 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="border-success-600/30 text-success-700 text-[13px] hover:bg-success-50 hover:border-success-600/50"
          onClick={() => handleMarkAll('JOIN')}
          disabled={!passengers.length || marking}
        >
          <Check size={16} strokeWidth={2.8} /> {t('attendance.markAllJoin')}
        </Button>
        <Button
          variant="outline"
          className="border-warning-500/40 text-[#b45309] text-[13px] hover:bg-warning-50 hover:border-warning-500/60"
          onClick={() => handleMarkAll('ABSENT')}
          disabled={!passengers.length || marking}
        >
          <X size={16} strokeWidth={2.8} /> {t('attendance.markAllAbsent')}
        </Button>
      </div>

      {/* ── Danh sách hành khách ────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto pb-36">
        <div className="mt-2 border-t border-gray-100">
          {passengers.length === 0 && (
            <div className="flex flex-col items-center text-center px-6 py-16 animate-rise">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 animate-float">
                <Users className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">{t('attendance.noPassengers')}</p>
            </div>
          )}
          {passengers.map((p, i) => {
            const status = p.attendanceRecord?.status
            const isJoined = status === 'JOIN'
            const isAbsent = status === 'ABSENT'
            // Round bị huỷ cascade record sang CANCELLED — làm mờ dòng + badge đỏ
            const isCancelled = status === 'CANCELLED'
            const noteText = p.tripPassengerAssignment.note
            const noteOpen = expandedNote === p.id

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
                className="relative overflow-hidden bg-white border-b border-gray-100"
              >
                {/* Lớp quét màu chạy từ trái khi đổi trạng thái — initial=false
                    để các dòng đã điểm danh sẵn không quét lại lúc mở trang */}
                <AnimatePresence initial={false}>
                  {(isJoined || isAbsent) && (
                    <motion.div
                      key={status}
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        'absolute inset-0 pointer-events-none',
                        isJoined
                          ? 'bg-gradient-to-r from-success-50 via-success-50 to-success-50/40'
                          : 'bg-gradient-to-r from-warning-50 via-warning-50 to-warning-50/40',
                      )}
                    />
                  )}
                </AnimatePresence>
                {/* Vạch trạng thái bên trái bật lên bằng spring */}
                <motion.span
                  className={cn(
                    'absolute left-0 inset-y-0 w-1 pointer-events-none',
                    isAbsent ? 'bg-warning-500' : 'bg-success-500',
                  )}
                  initial={false}
                  animate={{ scaleY: isJoined || isAbsent ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ originY: 0.5 }}
                />

                <div
                  className={cn(
                    'relative flex items-center gap-3.5 px-4 py-4 min-h-[84px]',
                    isCancelled && 'opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-display text-xs font-bold tabular-nums shrink-0 transition-colors duration-300',
                      isJoined
                        ? 'bg-success-100 text-success-700'
                        : isAbsent
                          ? 'bg-warning-100 text-[#92400e]'
                          : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Tên chiếm toàn bộ dòng đầu — badge type chuyển xuống dòng meta
                          để tên tiếng Việt dài không bị cắt trên màn hình hẹp */}
                      <h4 className="flex-1 min-w-0 text-[15px] font-bold text-navy-800 truncate">
                        {p.tripPassengerAssignment.name}
                      </h4>
                      {isCancelled && (
                        <Badge variant="CANCELLED" label={t('status.CANCELLED')} />
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 tabular-nums">
                      {/* SĐT ưu tiên hiển thị đủ (tài xế cần gọi khách) — badge type co lại trước */}
                      <span className="shrink-0">{p.tripPassengerAssignment.phone}</span>
                      {p.tripPassengerAssignment.type && (
                        <Badge
                          variant={`TYPE_${p.tripPassengerAssignment.type}` as BadgeVariant}
                          className="min-w-0 h-[18px] px-2 text-[10px]"
                          title={p.tripPassengerAssignment.type}
                        >
                          <span className="truncate">{p.tripPassengerAssignment.type}</span>
                        </Badge>
                      )}
                      {/* Giờ điểm danh — hiện ngay cả với bản ghi optimistic (markedAt local) */}
                      {p.attendanceRecord && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-semibold shrink-0',
                            isJoined
                              ? 'text-success-700'
                              : isAbsent
                                ? 'text-[#92400e]'
                                : 'text-gray-500',
                          )}
                        >
                          <Clock size={10} strokeWidth={2.5} className="shrink-0" />
                          {new Date(p.attendanceRecord.markedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>
                    {noteText && (
                      <button
                        onClick={() => setExpandedNote(noteOpen ? null : p.id)}
                        aria-expanded={noteOpen}
                        className="mt-2 block max-w-full rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-left text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors duration-150"
                      >
                        <span className={cn(noteOpen ? 'whitespace-pre-line' : 'block truncate')}>
                          {t('attendance.noteLabel', { note: noteText })}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Cặp nút điểm danh 56px — icon bật nảy success-pop khi kích hoạt */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      animate={isJoined ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      onClick={() => handleMark(p.id, 'JOIN')}
                      disabled={marking}
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center border-2 cursor-pointer select-none',
                        'transition-[background-color,border-color,color,box-shadow,opacity] duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        isJoined
                          ? 'bg-gradient-to-b from-success-500 to-success-600 border-success-600 text-white shadow-glow-success'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-success-500/60 hover:text-success-600 active:bg-success-50',
                        // Nút chưa chọn lùi nhẹ khi nút kia đang kích hoạt — vẫn bấm được
                        isAbsent && 'opacity-70',
                      )}
                      aria-label={t('status.JOIN')}
                    >
                      <Check
                        key={isJoined ? 'join-on' : 'join-off'}
                        size={26}
                        strokeWidth={3.2}
                        className={cn(isJoined && 'animate-success-pop')}
                      />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      animate={isAbsent ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      onClick={() => handleMark(p.id, 'ABSENT')}
                      disabled={marking}
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center border-2 cursor-pointer select-none',
                        'transition-[background-color,border-color,color,box-shadow,opacity] duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500 focus-visible:ring-offset-2',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        isAbsent
                          ? 'bg-gradient-to-b from-warning-500 to-warning-600 border-warning-600 text-white shadow-lg shadow-warning-500/35'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-warning-500/60 hover:text-warning-600 active:bg-warning-50',
                        // Nút chưa chọn lùi nhẹ khi nút kia đang kích hoạt — vẫn bấm được
                        isJoined && 'opacity-70',
                      )}
                      aria-label={t('status.ABSENT')}
                    >
                      <X
                        key={isAbsent ? 'absent-on' : 'absent-off'}
                        size={26}
                        strokeWidth={3.2}
                        className={cn(isAbsent && 'animate-success-pop')}
                      />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Thanh hành động dính đáy: hoàn tất round ────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-[420px]">
        <div className="glass shadow-sheet rounded-t-2xl border-t border-gray-200/60 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <Button
            size="lg"
            className="w-full h-14 text-base gap-2.5"
            disabled={!someMarked || completing}
            onClick={() => setShowConfirm(true)}
          >
            {completing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('attendance.completing')}
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                {t('attendance.completeRound')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Modal xác nhận hoàn tất round ───────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => !completing && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-float"
            >
              <div className="w-14 h-14 rounded-2xl bg-success-50 ring-1 ring-success-600/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-success-600 animate-success-pop" />
              </div>
              <h2 className="font-display text-lg font-bold tracking-tight text-navy-800 text-center mb-2">
                {t('attendance.confirmCompleteTitle')}
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
                {t('attendance.confirmCompleteBody')}
              </p>
              {completeError && (
                <p className="text-xs font-medium text-danger-600 bg-danger-50 border border-danger-100 rounded-xl px-3 py-2.5 mb-4 text-center">
                  {completeError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={completing}
                  className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-b from-success-500 to-success-600 text-white text-sm font-bold shadow-glow-success hover:brightness-105 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {completing && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {completing
                    ? t('attendance.completing')
                    : t('attendance.confirmCompleteButton')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
