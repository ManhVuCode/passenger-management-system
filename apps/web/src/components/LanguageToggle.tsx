import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const isVI = i18n.language === 'vi'

  function toggle() {
    i18n.changeLanguage(isVI ? 'en' : 'vi')
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 h-8 px-2 rounded-lg hover:bg-gray-100 transition-colors select-none"
      title={isVI ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
      aria-label="Toggle language"
    >
      <div
        className="relative w-10 h-5 bg-gray-200 rounded-full transition-colors data-[active=true]:bg-primary-600"
        data-active={isVI}
      >
        <motion.div
          animate={{ x: isVI ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-5">{isVI ? 'VI' : 'EN'}</span>
    </button>
  )
}
