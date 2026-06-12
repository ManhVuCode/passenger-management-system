import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../auth/authSlice'
import { useNavigate } from 'react-router-dom'
import { LogOut, Key, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '../../lib/utils'
import { LanguageToggle } from '../../components/LanguageToggle'
import { Badge, type BadgeVariant } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function ProfileDropdown() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const name = useAppSelector((s) => s.auth.name) ?? t('profile.driver')
  const email = useAppSelector((s) => s.auth.email) ?? ''
  const role = useAppSelector((s) => s.auth.role) ?? ''
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          // 44px — chạm thoải mái trên mobile (chuẩn touch target)
          'w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-btn cursor-pointer select-none transition-[transform,box-shadow] duration-150 hover:shadow-btn-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          // Khi menu mở: vòng ring chuyển sắc xanh để neo thị giác avatar ↔ popover
          open ? 'ring-2 ring-primary-300' : 'ring-2 ring-white/80',
        )}
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } }}
            // Lò xo gọn (stiffness cao, damping vừa) → popover bật ra tự nhiên kiểu Linear
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute right-0 top-[52px] w-[290px] origin-top-right bg-white rounded-2xl shadow-float border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-br from-primary-50 via-white to-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-base font-bold shadow-btn shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-navy-900 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{email}</p>
                  {role && (
                    <Badge
                      variant={role as BadgeVariant}
                      className="mt-1.5 uppercase tracking-wide"
                      label={role.replace('_', ' ')}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">{t('nav.language')}</span>
              <LanguageToggle />
            </div>

            <div className="p-2">
              <button
                role="menuitem"
                onClick={() => {
                  setShowChangePw(true)
                  setOpen(false)
                }}
                className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 cursor-pointer select-none transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 transition-colors duration-150 group-hover:bg-primary-50 group-hover:text-primary-600">
                  <Key size={16} aria-hidden="true" />
                </span>
                {t('auth.changePassword')}
              </button>

              <button
                role="menuitem"
                onClick={handleLogout}
                className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-danger-600 cursor-pointer select-none transition-[background-color,transform] duration-150 hover:bg-danger-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 mt-1"
              >
                <span className="w-9 h-9 rounded-lg bg-danger-50 flex items-center justify-center text-danger-600 shrink-0 transition-colors duration-150 group-hover:bg-danger-100">
                  <LogOut size={16} aria-hidden="true" />
                </span>
                {t('nav.signOut')}
              </button>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
                {t('profile.appFooter')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      </AnimatePresence>
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const token = useAppSelector((s) => s.auth.accessToken)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (next !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (next.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? t('auth.failedChangePassword'))
        return
      }
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError(t('errors.connectionError'))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15, ease: 'easeIn' } }}
        // Dialog bật vào bằng lò xo — đồng bộ nhịp chuyển động với popover
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-float"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold tracking-tight text-navy-900">
            {t('auth.changePassword')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            // 44px touch target, kéo lệch nhẹ để cân thị giác với mép dialog
            className="w-11 h-11 -mr-2.5 -mt-1 rounded-xl flex items-center justify-center text-gray-500 cursor-pointer transition-colors duration-150 hover:text-navy-900 hover:bg-gray-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {success ? (
          <div className="py-5 text-center">
            <div className="animate-success-pop inline-flex items-center justify-center rounded-xl bg-success-50 ring-1 ring-inset ring-success-600/20 px-4 py-3">
              <p className="text-success-700 font-bold text-sm">{t('auth.passwordChanged')}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <PasswordField label={t('auth.currentPassword')} value={current} onChange={setCurrent} />
            <PasswordField label={t('auth.newPassword')} value={next} onChange={setNext} />
            <PasswordField label={t('auth.confirmPassword')} value={confirm} onChange={setConfirm} />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  role="alert"
                  className="text-danger-600 text-xs font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full mt-2">
              {t('auth.updatePassword')}
            </Button>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  // Bọc bằng <label> để liên kết nhãn–ô nhập tự nhiên (không cần id)
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        {label}
      </span>
      <Input
        type="password"
        required
        minLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
