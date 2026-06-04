import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import {
  useGetNotificationHistoryQuery,
  useSimulateRsvpMutation,
  type NotificationLog,
} from './notificationApi'
import { DataTable, type Column } from '../../components/ui/data-table'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { EmptyState } from '../../components/ui/empty-state'

function statusVariant(status: string): BadgeVariant {
  if (status === 'SENT' || status === 'DELIVERED') return 'success'
  if (status === 'FAILED' || status === 'BOUNCED' || status === 'NO_ANSWER') return 'destructive'
  if (status === 'QUEUED') return 'warning'
  return 'secondary'
}

export default function NotificationHistory({ tripId }: { tripId: string }) {
  const { t } = useTranslation()
  // Các dòng SMS/Voice/Zalo bắt đầu ở trạng thái QUEUED rồi mới chuyển sang SENT/FAILED sau đó
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
        <span className="whitespace-nowrap text-gray-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'channel',
      header: t('notifications.colChannel'),
      render: (r) => <Badge variant="secondary" label={r.channel} />,
    },
    {
      key: 'trigger',
      header: t('notifications.colTrigger'),
      render: (r) => <span className="text-xs font-medium text-gray-500">{r.trigger}</span>,
    },
    {
      key: 'recipient',
      header: t('notifications.colRecipient'),
      render: (r) => <span className="font-mono text-xs text-gray-500">{r.toContact ?? '—'}</span>,
    },
    {
      key: 'status',
      header: t('notifications.colStatus'),
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={statusVariant(r.status)} label={r.status} />
          {r.errorReason && (
            <span className="text-[10px] text-gray-400">{r.errorReason}</span>
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
            <div className="flex gap-1">
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  void simulateRsvp({ tripId, roundId, logId: r.id, rsvp: 'WILL_BOARD' })
                }
                className="rounded border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {t('notifications.simWillBoard')}
              </button>
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  void simulateRsvp({ tripId, roundId, logId: r.id, rsvp: 'WONT_BOARD' })
                }
                className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {t('notifications.simWontBoard')}
              </button>
            </div>
          )
        }
        return <span className="text-gray-300">—</span>
      },
    },
    {
      key: 'message',
      header: t('notifications.colMessage'),
      render: (r) => (
        <span className="line-clamp-1 block max-w-[280px] text-gray-700">{r.messageText}</span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={logs}
      rowKey={(r) => r.id}
      loading={isLoading}
      empty={<EmptyState icon={Bell} title={t('notifications.historyEmpty')} />}
    />
  )
}
