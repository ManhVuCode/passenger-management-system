import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { cn } from '../lib/utils'

// Pill chuyển ngôn ngữ VI/EN — thumb trắng trượt bằng spring, vùng chạm 44px
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const isVI = i18n.language === 'vi'

  function toggle() {
    i18n.changeLanguage(isVI ? 'en' : 'vi')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="group inline-flex h-11 min-w-[44px] items-center justify-center cursor-pointer select-none rounded-full px-0.5 transition-transform duration-150 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      title={isVI ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
      aria-label="Toggle language"
      aria-pressed={isVI}
    >
      <span className="relative flex h-8 items-center rounded-full bg-gray-100 p-0.5 ring-1 ring-inset ring-gray-200 transition-colors group-hover:bg-gray-200/80">
        {/* Thumb trắng trượt giữa hai nhãn */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: isVI ? 0 : 32 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute left-0.5 h-7 w-8 rounded-full bg-white shadow-card ring-1 ring-gray-900/5"
        />
        <span
          className={cn(
            'relative z-10 w-8 text-center text-[11px] font-bold tracking-wide transition-colors duration-200',
            isVI ? 'text-primary-700' : 'text-gray-500',
          )}
        >
          VI
        </span>
        <span
          className={cn(
            'relative z-10 w-8 text-center text-[11px] font-bold tracking-wide transition-colors duration-200',
            isVI ? 'text-gray-500' : 'text-primary-700',
          )}
        >
          EN
        </span>
      </span>
    </button>
  )
}
