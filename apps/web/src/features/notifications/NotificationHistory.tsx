import { useEffect, useState, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellRing, Mail, MessageSquare, PhoneCall, Radio, Send, Webhook } from 'lucide-react'
import {
  useGetNotificationHistoryQuery,
  useSimulateRsvpMutation,
  type NotificationLog,
} from './notificationApi'
import { DataTable, type Column } from '../../components/ui/data-table'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { EmptyState } from '../../components/ui/empty-state'
import { SectionCard } from '../../components/ui/section-card'

function statusVariant(status: string): BadgeVariant {
  if (status === 'SENT' || status === 'DELIVERED') return 'success'
  if (status === 'FAILED' || status === 'BOUNCED' || status === 'NO_ANSWER') return 'destructive'
  if (status === 'QUEUED') return 'warning'
  return 'secondary'
}

// Icon lucide cho từng kênh gửi — đồng bộ với bộ chọn kênh ở NotificationPanel
const CHANNEL_ICONS: Record<string, ElementType> = {
  SMS: MessageSquare,
  TEAMS: Webhook,
  IN_APP: BellRing,
  VOICE: PhoneCall,
  TELEGRAM: Send,
  BROADCAST: Radio,
  EMAIL: Mail,
}

/* Chấm màu theo trạng thái ở cột thời gian — tạo cảm giác dòng thời gian cho lịch sử.
   Dòng QUEUED nhận chấm "live" nhấp nháy trong lúc worker còn xử lý. */
function StatusDot({ status }: { status: string }) {
  if (status === 'QUEUED') {
    return (
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-warning-500 animate-ping-soft" />
        <span className="relative h-2 w-2 rounded-full bg-warning-500 animate-pulse-soft" />
      </span>
    )
  }
  const color =
    status === 'SENT' || status === 'DELIVERED'
      ? 'bg-success-500'
      : status === 'FAILED' || status === 'BOUNCED' || status === 'NO_ANSWER'
        ? 'bg-danger-500'
        : 'bg-gray-300'
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
}

// Số dòng hiển thị mỗi trang — lịch sử có thể rất dài (mỗi lần gửi × mỗi hành khách)
const PAGE_SIZE = 15

export default function NotificationHistory({ tripId }: { tripId: string }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Các dòng SMS/Voice/Telegram bắt đầu ở trạng thái QUEUED rồi mới chuyển sang SENT/FAILED sau đó
  // trong worker, vốn không phát tín hiệu invalidation. Chỉ poll khi còn dòng đang chờ xử lý, sau đó dừng.
  const [poll, setPoll] = useState(false)
  const [simulateRsvp, { isLoading: simulating }] = useSimulateRsvpMutation()
  const { data: logs = [], isLoading } = useGetNotificationHistoryQuery(
    { tripId },
    { pollingInterval: poll ? 4000 : 0, skipPollingIfUnfocused: true },
  )
  useEffect(() => {
    setPoll(logs.some((l) => l.status === 'QUEUED'))
  }, [logs])

  const columns: Column<NotificationLog>[] = [
    {
      key: 'createdAt',
      header: t('notifications.colTime'),
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <StatusDot status={r.status} />
          <span className="tabular-nums text-gray-600">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        </span>
      ),
    },
    {
      key: 'channel',
      header: t('notifications.colChannel'),
      render: (r) => {
        const Icon = CHANNEL_ICONS[r.channel] ?? Bell
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <Icon size={12} />
            </span>
            <span className="text-xs font-semibold text-navy-900">{r.channel}</span>
          </span>
        )
      },
    },
    {
      key: 'trigger',
      header: t('notifications.colTrigger'),
      render: (r) => (
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-600">
          {r.trigger}
        </span>
      ),
    },
    {
      key: 'recipient',
      header: t('notifications.colRecipient'),
      render: (r) => <span className="font-mono text-xs text-gray-600">{r.toContact ?? '—'}</span>,
    },
    {
      key: 'status',
      header: t('notifications.colStatus'),
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={statusVariant(r.status)} label={r.status} />
          {r.errorReason && (
            <span className="text-[11px] leading-tight text-danger-600">{r.errorReason}</span>
          )}
        </div>
      ),
    },
    {
      key: 'rsvp',
      header: t('notifications.colRsvp'),
      render: (r) => {
        if (r.rsvp) {
          return (
            <Badge
              variant={r.rsvp === 'WILL_BOARD' ? 'success' : 'destructive'}
              label={t(
                r.rsvp === 'WILL_BOARD'
                  ? 'notifications.rsvpWillBoard'
                  : 'notifications.rsvpWontBoard',
              )}
            />
          )
        }
        // Điều khiển thủ công: mô phỏng hành khách bấm 1 / 2 trong một cuộc gọi đã được trả lời.
        // Chỉ là ý định — backend ghi nhận vào log, không bao giờ ghi vào dữ liệu điểm danh.
        const answered = r.status === 'DELIVERED' || r.status === 'SENT'
        if (r.channel === 'VOICE' && answered && r.roundId) {
          const roundId = r.roundId
          return (
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  void simulateRsvp({ tripId, roundId, logId: r.id, rsvp: 'WILL_BOARD' })
                }
                className="cursor-pointer rounded-lg border border-success-200 bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700 transition-colors duration-150 hover:bg-success-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('notifications.simWillBoard')}
              </button>
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  void simulateRsvp({ tripId, roundId, logId: r.id, rsvp: 'WONT_BOARD' })
                }
                className="cursor-pointer rounded-lg border border-danger-100 bg-danger-50 px-2 py-0.5 text-[11px] font-semibold text-danger-600 transition-colors duration-150 hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('notifications.simWontBoard')}
              </button>
            </div>
          )
        }
        return (
          <span className="text-gray-300" aria-hidden="true">
            —
          </span>
        )
      },
    },
    {
      key: 'message',
      header: t('notifications.colMessage'),
      render: (r) => (
        <span
          className="line-clamp-1 block max-w-[280px] text-gray-700"
          title={r.messageText}
        >
          {r.messageText}
        </span>
      ),
    },
  ]

  const remaining = logs.length - visible

  return (
    <SectionCard bodyClassName="p-0">
      <DataTable
        columns={columns}
        data={logs.slice(0, visible)}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={<EmptyState icon={Bell} title={t('notifications.historyEmpty')} />}
      />
      {remaining > 0 && (
        <div className="border-t border-gray-100 p-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors duration-150 hover:bg-primary-50"
          >
            {t('notifications.showMore', { count: Math.min(remaining, PAGE_SIZE), remaining })}
          </button>
        </div>
      )}
    </SectionCard>
  )
}
