import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
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

const LABELS: Record<keyof AutoRules, { label: string; desc: string }> = {
  roundStarted: { label: 'ruleRoundStarted', desc: 'ruleRoundStartedDesc' },
  roundCancelled: { label: 'ruleRoundCancelled', desc: 'ruleRoundCancelledDesc' },
  roundCompleted: { label: 'ruleRoundCompleted', desc: 'ruleRoundCompletedDesc' },
  boardingReminder: { label: 'ruleBoardingReminder', desc: 'ruleBoardingReminderDesc' },
}

function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-sky-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
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
    <Card>
      <CardHeader>
        <CardTitle>{t('notifications.rulesTitle')}</CardTitle>
        <p className="text-sm text-slate-500">{t('notifications.rulesSubtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {RULE_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-800">{t(`notifications.${LABELS[key].label}`)}</div>
              <div className="text-xs text-slate-500">{t(`notifications.${LABELS[key].desc}`)}</div>
            </div>
            <Toggle
              on={rules?.[key] ?? false}
              disabled={!rules || isLoading}
              onChange={(next) => toggle(key, next)}
            />
          </div>
        ))}
        {error ? <p className="text-sm text-red-600">{t('notifications.rulesError')}</p> : null}
      </CardContent>
    </Card>
  )
}
