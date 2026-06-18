import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, Copy, Send, Trash2 } from 'lucide-react'
import { SectionCard } from '../../components/ui/section-card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  useGetTelegramConfigQuery,
  useSetTelegramConfigMutation,
  useClearTelegramConfigMutation,
} from './notificationApi'

/* QR công khai cho link t.me (không chứa secret) — tránh thêm thư viện QR vào bundle. */
const qrSrc = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(data)}`

/**
 * D1 — cấu hình bot Telegram theo tenant: dán token @BotFather để bật kênh Telegram +
 * bot tự đăng ký, hiển thị link/QR cho hành khách quét. Token chỉ gửi đi, không hiển thị lại.
 */
export default function TelegramConfig() {
  const { t } = useTranslation()
  const { data: cfg } = useGetTelegramConfigQuery()
  const [setConfig, { isLoading: saving, error: saveError }] = useSetTelegramConfigMutation()
  const [clearConfig, { isLoading: clearing }] = useClearTelegramConfigMutation()
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

  const save = async () => {
    if (!token.trim()) return
    try {
      await setConfig({ botToken: token.trim() }).unwrap()
      setToken('')
    } catch {
      /* lỗi hiển thị qua saveError */
    }
  }

  const copyLink = async () => {
    if (!cfg?.registrationLink) return
    try {
      await navigator.clipboard.writeText(cfg.registrationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard có thể bị chặn — bỏ qua */
    }
  }

  return (
    <SectionCard title={t('notifications.tgTitle')} subtitle={t('notifications.tgSubtitle')}>
      {/* Hàng trạng thái: xanh khi đã cấu hình, xám khi chưa */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${
              cfg?.configured ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'bg-gray-300'
            }`}
          />
          <span className="text-sm font-medium text-navy-900">
            {cfg?.configured ? t('notifications.tgActive') : t('notifications.tgInactive')}
            {cfg?.configured && cfg.botUsername ? (
              <span className="ml-1 text-gray-500">@{cfg.botUsername}</span>
            ) : null}
          </span>
        </div>
        {cfg?.configured ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={clearing}
            onClick={() => void clearConfig()}
            className="text-danger-600 hover:bg-danger-50"
          >
            <Trash2 size={14} className="mr-1.5" /> {t('notifications.tgClear')}
          </Button>
        ) : null}
      </div>

      {/* Link + QR đăng ký cho hành khách (chỉ khi đã có @username) */}
      <AnimatePresence initial={false}>
        {cfg?.registrationLink ? (
          <motion.div
            key="tg-reg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-gray-50/60 p-4 sm:flex-row sm:items-center">
              <img
                src={qrSrc(cfg.registrationLink)}
                alt="Telegram registration QR"
                width={120}
                height={120}
                className="h-[120px] w-[120px] shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-border"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy-900">
                  {t('notifications.tgRegLink')}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-gray-600">
                  {t('notifications.tgRegHint')}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={cfg.registrationLink}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-[13px] text-primary-600 ring-1 ring-border hover:underline"
                  >
                    {cfg.registrationLink}
                  </a>
                  <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="ml-1.5">
                      {copied ? t('notifications.tgCopied') : t('notifications.tgCopy')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Ô nhập token: đặt mới hoặc thay token */}
      <label className="mb-1.5 block text-[13px] font-medium text-gray-600">
        {cfg?.configured ? t('notifications.tgTokenReplace') : t('notifications.tgTokenLabel')}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="password"
          autoComplete="off"
          placeholder={t('notifications.tgTokenPlaceholder')}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
        />
        <Button disabled={saving || !token.trim()} onClick={() => void save()} className="shrink-0">
          <Send size={14} className="mr-1.5" />
          {saving ? t('notifications.tgSaving') : t('notifications.tgSave')}
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-gray-500">{t('notifications.tgTokenHint')}</p>

      <AnimatePresence initial={false}>
        {saveError ? (
          <motion.div
            key="tg-error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            <AlertCircle size={14} className="shrink-0" /> {t('notifications.tgInvalid')}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SectionCard>
  )
}
