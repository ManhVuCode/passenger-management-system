import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSendNotificationMutation, type NotificationChannel } from './notificationApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { MessageSquare, Webhook, BellRing, PhoneCall, Send, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [result, setResult] = useState<{ channel: string; sent: number; devMode: boolean } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const channels: {
    key: NotificationChannel
    label: string
    icon: React.ElementType
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
    try {
      const res = await send({ tripId, roundId, channel, message }).unwrap()
      setResult({ channel, sent: res.sent, devMode: res.devMode })
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : t('errors.serverError'))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare size={14} /> {t('notifications.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="w-full h-16 text-sm border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          {channels.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => handleSend(key)}
              disabled={isLoading || !message.trim()}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-50 text-center transition-colors"
            >
              <Icon size={18} className="text-slate-500" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-xs text-slate-400 leading-tight">{description}</span>
            </button>
          ))}
        </div>

        {result && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckCircle size={13} />
            {t('notifications.sentSuccess', { channel: result.channel, count: result.sent })}
            {result.devMode && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {t('notifications.devMode')}
              </Badge>
            )}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
