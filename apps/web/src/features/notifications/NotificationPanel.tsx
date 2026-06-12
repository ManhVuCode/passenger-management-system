import { useState, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { useSendNotificationMutation, type NotificationChannel } from './notificationApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  AlertCircle,
  BellRing,
  CheckCircle,
  Loader2,
  MessageSquare,
  PhoneCall,
  Send,
  Webhook,
} from 'lucide-react'

/* Bảng gửi thông báo cho hành khách của một round — bộ chọn kênh dạng lưới có hiệu ứng */
export default function NotificationPanel({
  tripId,
  roundId,
}: {
  tripId: string
  roundId: string
}) {
  const { t } = useTranslation()
  const [send, { isLoading }] = useSendNotificationMutation()
  const [message, setMessage] = useState('Please board the bus. Departure in 5 minutes.')
  // Kênh đang gửi — chỉ phục vụ hiệu ứng spinner trên đúng ô kênh vừa bấm
  const [activeChannel, setActiveChannel] = useState<NotificationChannel | null>(null)
  const [result, setResult] = useState<{ channel: string; sent: number; devMode: boolean } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const channels: {
    key: NotificationChannel
    label: string
    icon: ElementType
    description: string
  }[] = [
    { key: 'SMS', label: t('notifications.sms'), icon: MessageSquare, description: t('notifications.smsDesc') },
    { key: 'TEAMS', label: t('notifications.teams'), icon: Webhook, description: t('notifications.teamsDesc') },
    {
      key: 'IN_APP',
      label: t('notifications.inApp'),
      icon: BellRing,
      description: t('notifications.inAppDesc'),
    },
    {
      key: 'VOICE',
      label: t('notifications.voice'),
      icon: PhoneCall,
      description: t('notifications.voiceDesc'),
    },
    {
      key: 'TELEGRAM',
      label: t('notifications.telegram'),
      icon: Send,
      description: t('notifications.telegramDesc'),
    },
  ]

  async function handleSend(channel: NotificationChannel) {
    setResult(null)
    setError(null)
    setActiveChannel(channel)
    try {
      const res = await send({ tripId, roundId, channel, message }).unwrap()
      setResult({ channel, sent: res.sent, devMode: res.devMode })
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : t('errors.serverError'))
    } finally {
      setActiveChannel(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          {/* Ô icon gradient nhận diện thương hiệu */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-glow">
            <MessageSquare size={14} />
          </span>
          {t('notifications.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label
            htmlFor={`notify-message-${roundId}`}
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-600"
          >
            {t('notifications.message')}
          </label>
          <textarea
            id={`notify-message-${roundId}`}
            className="h-16 w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy-900 transition-[border-color,box-shadow] duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/25"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Lưới kênh: vào màn so le 40ms, hover nâng nhẹ, spinner trên kênh đang gửi */}
        <div className="grid grid-cols-2 gap-2">
          {channels.map(({ key, label, icon: Icon, description }, i) => {
            const sending = isLoading && activeChannel === key
            const justSent = result?.channel === key
            return (
              <motion.button
                key={key}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => handleSend(key)}
                disabled={isLoading || !message.trim()}
                className={`group flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 ${
                  justSent
                    ? 'border-success-200 bg-success-50/40'
                    : 'border-border enabled:hover:border-primary-200 enabled:hover:bg-primary-50/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                    justSent
                      ? 'bg-success-100 text-success-600'
                      : 'bg-gray-100 text-gray-500 group-hover:group-enabled:bg-primary-100 group-hover:group-enabled:text-primary-600'
                  }`}
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin text-primary-600" />
                  ) : justSent ? (
                    <CheckCircle size={15} />
                  ) : (
                    <Icon size={15} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-navy-900">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-600">
                    {description}
                  </span>
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* Banner kết quả / lỗi trượt vào nhẹ nhàng */}
        <AnimatePresence initial={false}>
          {result && (
            <motion.div
              key="send-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700"
            >
              <CheckCircle size={14} className="shrink-0 text-success-600" />
              {t('notifications.sentSuccess', { channel: result.channel, count: result.sent })}
              {result.devMode && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {t('notifications.devMode')}
                </Badge>
              )}
            </motion.div>
          )}
          {error && (
            <motion.div
              key="send-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              <AlertCircle size={14} className="shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
