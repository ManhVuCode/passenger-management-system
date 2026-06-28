import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { consumeSsoHash } from './sso'
import { Bus, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://web-pi-nine-58.vercel.app'

// PWA có form đăng nhập riêng: ai cũng đăng nhập thẳng vào đây được (tài xế xem chuyến
// của mình; admin cũng vào xem được). Vẫn nhận phiên SSO nếu được chuyển sang.
export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sso = consumeSsoHash()
    if (sso) {
      dispatch(setCredentials(sso))
      navigate('/', { replace: true })
      return
    }
    if (localStorage.getItem('accessToken')) {
      navigate('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError(t('auth.invalidCredentials'))
        return
      }
      const json = await res.json()
      const data = json && typeof json === 'object' && 'data' in json ? json.data : json
      dispatch(setCredentials(data))
      navigate('/', { replace: true })
    } catch {
      setError(t('auth.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-navy-950 px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-primary-500 to-primary-700 text-white shadow-glow ring-1 ring-white/25">
            <Bus size={24} aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-white">MPMS</p>
            <p className="text-xs text-white/60">BusManager</p>
          </div>
        </motion.div>

        <h1 className="mb-6 font-display text-2xl font-bold text-white">{t('auth.signIn')}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl bg-white/10 pl-12 pr-4 font-medium text-white ring-1 ring-white/15 transition placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl bg-white/10 pl-12 pr-12 font-medium text-white ring-1 ring-white/15 transition placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-primary-500 to-primary-600 font-bold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                {t('auth.signIn')}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href = WEB_URL
          }}
          className="mx-auto mt-6 flex items-center gap-1.5 text-xs font-semibold text-white/50 transition-colors hover:text-white"
        >
          <ArrowRight size={13} />
          {t('auth.backToOfficial')}
        </button>
      </div>
    </div>
  )
}
