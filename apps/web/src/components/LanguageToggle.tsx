import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { cn } from '../lib/utils'

export interface LanguageToggleProps {
  /** 'dark' cho sidebar navy (mặc định), 'light' cho nền sáng */
  variant?: 'dark' | 'light'
  className?: string
}

const LANGS = [
  { code: 'vi', label: 'VI', name: 'Tiếng Việt' },
  { code: 'en', label: 'EN', name: 'English' },
] as const

/**
 * Bộ chuyển ngôn ngữ dạng segmented pill: hai lựa chọn VI/EN với
 * thumb trắng trượt mượt bằng layoutId (spring). Hoạt động trên cả nền navy và nền sáng.
 */
export function LanguageToggle({ variant = 'dark', className }: LanguageToggleProps) {
  const { i18n } = useTranslation()
  const active = i18n.language?.startsWith('vi') ? 'vi' : 'en'
  const dark = variant === 'dark'

  return (
    <div
      role="group"
      aria-label="Toggle language"
      className={cn(
        'relative inline-flex h-8 items-center rounded-full p-0.5 select-none',
        dark ? 'bg-white/10 ring-1 ring-white/10' : 'bg-gray-100 ring-1 ring-gray-200',
        className,
      )}
    >
      {LANGS.map(({ code, label, name }) => {
        const isActive = active === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            aria-pressed={isActive}
            aria-label={name}
            title={name}
            className={cn(
              'relative h-7 w-9 rounded-full text-[11px] font-bold tracking-wide cursor-pointer',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70',
              isActive
                ? 'text-navy-900'
                : dark
                  ? 'text-navy-300 hover:text-white'
                  : 'text-gray-500 hover:text-gray-900',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="lang-toggle-thumb"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className={cn(
                  'absolute inset-0 rounded-full bg-white shadow-sm',
                  !dark && 'ring-1 ring-gray-200',
                )}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
