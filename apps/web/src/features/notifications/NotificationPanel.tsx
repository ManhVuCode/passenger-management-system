import { useState, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  useSendNotificationMutation,
  useGetEmailEligibilityQuery,
  type NotificationChannel,
} from './notificationApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  X,
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

  // Luồng gửi email cho hành khách: mở modal → (cảnh báo nếu có người thiếu email) → nhập nội dung → gửi
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [emailBody, setEmailBody] = useState('')
  const [emailResult, setEmailResult] = useState<{ sent: number; skipped: number } | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const { data: eligibility, isFetching: eligLoading } = useGetEmailEligibilityQuery(
    { tripId, roundId },
    { skip: !emailOpen, refetchOnMountOrArgChange: true },
  )
  const missing = eligibility?.withoutEmail ?? 0
  const needsConfirm = missing > 0 && !emailConfirmed

  function closeEmail() {
    setEmailOpen(false)
    setEmailConfirmed(false)
    setEmailBody('')
    setEmailResult(null)
    setEmailError(null)
  }

  async function handleSendEmail() {
    setEmailError(null)
    try {
      const res = await send({ tripId, roundId, channel: 'EMAIL', message: emailBody }).unwrap()
      setEmailResult({ sent: res.sent, skipped: res.skipped })
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message
      setEmailError(typeof msg === 'string' ? msg : t('errors.serverError'))
    }
  }

  const channels: {
    key: NotificationChannel
    label: string
    icon: ElementType
    description: string
  }[] = [
    { key: 'SMS', label: t('notifications.sms'), icon: MessageSquare, description: t('notifications.smsDesc') },
    {
      key: 'IN_APP',
      label: t('notifications.inApp'),
      icon: BellRing,
      description: t('notifications.inAppDesc'),
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

        {/* Nút gửi email cho hành khách — luồng riêng có xác nhận + soạn nội dung */}
        <button
          type="button"
          onClick={() => setEmailOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50/50 px-3 py-2.5 text-sm font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-100/60"
        >
          <Mail size={15} />
          {t('notifications.emailPassengers')}
        </button>

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
              {/* IN_APP is a driver broadcast: res.sent is drivers online, not passengers. */}
              {result.channel === 'IN_APP'
                ? result.sent > 0
                  ? t('notifications.broadcastSent', { count: result.sent })
                  : t('notifications.broadcastNoDrivers')
                : t('notifications.sentSuccess', { channel: result.channel, count: result.sent })}
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

        {/* Modal soạn & gửi email cho hành khách — cảnh báo nếu chưa phải ai cũng có email */}
        <AnimatePresence>
          {emailOpen && (
            <motion.div
              key="email-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm"
              onClick={closeEmail}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-float"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                    <Mail size={15} className="text-primary-600" />
                    {t('notifications.emailModalTitle')}
                  </h3>
                  <button
                    type="button"
                    onClick={closeEmail}
                    className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-navy-900"
                    aria-label={t('common.cancel')}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 p-5">
                  {eligLoading ? (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      {t('notifications.emailChecking')}
                    </p>
                  ) : emailResult ? (
                    <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-3 py-2.5 text-sm text-success-700">
                      <CheckCircle size={15} className="shrink-0 text-success-600" />
                      {t('notifications.emailSent', { count: emailResult.sent })}
                    </div>
                  ) : eligibility && eligibility.withEmail === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5 text-sm text-warning-700">
                      <AlertTriangle size={15} className="shrink-0" />
                      {t('notifications.emailNone')}
                    </div>
                  ) : needsConfirm ? (
                    <>
                      <div className="flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-3 py-3 text-sm text-warning-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {t('notifications.emailWarn', {
                            without: missing,
                            total: eligibility?.total ?? 0,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeEmail}
                          className="cursor-pointer rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailConfirmed(true)}
                          className="cursor-pointer rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90"
                        >
                          {t('notifications.emailContinue')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-600">
                        {t('notifications.emailComposeHint', { count: eligibility?.withEmail ?? 0 })}
                      </p>
                      <textarea
                        className="h-28 w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy-900 transition-[border-color,box-shadow] duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/25"
                        placeholder={t('notifications.emailPlaceholder')}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        autoFocus
                      />
                      {emailError && (
                        <div className="flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                          <AlertCircle size={14} className="shrink-0" /> {emailError}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeEmail}
                          className="cursor-pointer rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendEmail}
                          disabled={isLoading || !emailBody.trim()}
                          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Mail size={14} />
                          )}
                          {t('notifications.emailSend')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
