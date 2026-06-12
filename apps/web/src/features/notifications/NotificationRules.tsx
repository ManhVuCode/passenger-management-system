import { type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { AlarmClock, AlertCircle, CheckCircle2, PlayCircle, XCircle } from 'lucide-react'
import { SectionCard } from '../../components/ui/section-card'
import {
  useGetAutoRulesQuery,
  useUpdateAutoRulesMutation,
  type AutoRules,
} from './notificationApi'

const RULE_KEYS: (keyof AutoRules)[] = [
  'roundStarted',
  'roundCancelled',
  'roundCompleted',
  'boardingReminder',
]

const LABELS: Record<keyof AutoRules, { label: string; desc: string; icon: ElementType }> = {
  roundStarted: { label: 'ruleRoundStarted', desc: 'ruleRoundStartedDesc', icon: PlayCircle },
  roundCancelled: { label: 'ruleRoundCancelled', desc: 'ruleRoundCancelledDesc', icon: XCircle },
  roundCompleted: { label: 'ruleRoundCompleted', desc: 'ruleRoundCompletedDesc', icon: CheckCircle2 },
  boardingReminder: { label: 'ruleBoardingReminder', desc: 'ruleBoardingReminderDesc', icon: AlarmClock },
}

/* Công tắc bật/tắt: núm gạt trượt bằng spring (layout animation), nền gradient khi bật */
function Toggle({
  on,
  disabled,
  label,
  onChange,
}: {
  on: boolean
  disabled: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        on
          ? 'justify-end bg-gradient-to-r from-sky-500 to-primary-600 shadow-glow'
          : 'justify-start bg-gray-300'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/[0.06]"
      />
    </button>
  )
}

export default function NotificationRules() {
  const { t } = useTranslation()
  const { data: rules } = useGetAutoRulesQuery()
  const [updateAutoRules, { isLoading, error }] = useUpdateAutoRulesMutation()

  const toggle = (key: keyof AutoRules, next: boolean) => {
    void updateAutoRules({ [key]: next })
  }

  return (
    <SectionCard
      title={t('notifications.rulesTitle')}
      subtitle={t('notifications.rulesSubtitle')}
      bodyClassName="p-0"
    >
      <div className="divide-y divide-gray-100">
        {RULE_KEYS.map((key, i) => {
          const Icon = LABELS[key].icon
          const on = rules?.[key] ?? false
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
              className="flex items-center justify-between gap-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50/70"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                {/* Ô icon đổi sắc theo trạng thái bật/tắt của luật */}
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                    on ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy-900">
                    {t(`notifications.${LABELS[key].label}`)}
                  </div>
                  <div className="text-[13px] text-gray-600">
                    {t(`notifications.${LABELS[key].desc}`)}
                  </div>
                </div>
              </div>
              <Toggle
                on={on}
                disabled={!rules || isLoading}
                label={t(`notifications.${LABELS[key].label}`)}
                onChange={(next) => toggle(key, next)}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Thông báo lỗi trượt vào khi cập nhật luật thất bại */}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.div
            key="rules-error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mx-6 mb-4 mt-1 flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            <AlertCircle size={14} className="shrink-0" /> {t('notifications.rulesError')}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SectionCard>
  )
}
