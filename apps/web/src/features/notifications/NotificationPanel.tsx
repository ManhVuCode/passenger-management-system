import { useState } from 'react'
import { useSendNotificationMutation, type NotificationChannel } from './notificationApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { MessageSquare, Webhook, Phone, CheckCircle, AlertCircle } from 'lucide-react'

const CHANNELS: {
  key: NotificationChannel
  label: string
  icon: React.ElementType
  description: string
}[] = [
  { key: 'SMS', label: 'SMS', icon: MessageSquare, description: 'Text to passenger phones' },
  { key: 'TEAMS', label: 'Teams', icon: Webhook, description: 'Post to Teams channel' },
  { key: 'BROADCAST', label: 'Broadcast Call', icon: Phone, description: 'Voice call — board the bus' },
]

export default function NotificationPanel({
  tripId,
  roundId,
}: {
  tripId: string
  roundId: string
}) {
  const [send, { isLoading }] = useSendNotificationMutation()
  const [message, setMessage] = useState('Please board the bus. Departure in 5 minutes.')
  const [result, setResult] = useState<{ channel: string; sent: number; devMode: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(channel: NotificationChannel) {
    setResult(null)
    setError(null)
    try {
      const res = await send({ tripId, roundId, channel, message }).unwrap()
      setResult({ channel, sent: res.sent, devMode: res.devMode })
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : 'Failed to send')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare size={14} /> Notify Passengers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="w-full h-16 text-sm border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map(({ key, label, icon: Icon, description }) => (
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

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-border">
          <a
            href="https://zalo.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 font-medium hover:underline"
          >
            Open Zalo
          </a>
          <span>— client-side only, opens Zalo Web/App directly</span>
        </div>

        {result && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckCircle size={13} />
            {result.channel} → {result.sent} passenger{result.sent !== 1 ? 's' : ''}
            {result.devMode && (
              <Badge variant="secondary" className="ml-1 text-xs">
                dev mode
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
