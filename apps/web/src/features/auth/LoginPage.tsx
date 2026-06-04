import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { Button } from '../../components/ui/button'
import { Bus, ArrowRight, Eye, EyeOff } from 'lucide-react'

const HERO_IMG =
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&q=80&auto=format&fit=crop'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      navigate(data.role === 'SYSTEM_ADMIN' ? '/system' : '/')
    } catch {
      setError(t('auth.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Panel hero bên trái — chiếm 60% trên desktop, ẩn trên mobile */}
      <div
        className="hidden lg:flex relative w-[60%] overflow-hidden"
        style={{
          backgroundImage: `url('${HERO_IMG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900/85 via-navy-900/70 to-primary-600/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.25),transparent_60%)]" />

        <div className="relative z-10 flex flex-col justify-between p-14 text-white w-full">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center shadow-glow">
              <Bus size={22} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">MPMS</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
              {t('auth.heroTitle')}
            </h1>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              {t('auth.heroSubtitle')}
            </p>

            <div className="flex items-center gap-6 pt-4">
              <FeatureDot label={t('auth.featureRealtime')} />
              <FeatureDot label={t('auth.featureOffline')} />
              <FeatureDot label={t('auth.featureMultitenant')} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50"
          >
            © {new Date().getFullYear()} MPMS · {t('auth.heroCaption')}
          </motion.div>
        </div>
      </div>

      {/* Panel form bên phải — chiếm 40% trên desktop, full width trên mobile */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-glow">
              <Bus size={22} />
            </div>
            <span className="font-bold tracking-tight text-lg text-navy-900">MPMS</span>
          </div>

          <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight mb-2">
            {t('auth.signInHeading')}
          </h2>
          <p className="text-gray-500 text-sm mb-10">{t('auth.adminOperations')}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                placeholder="admin@demo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-4 pr-12 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-md gap-2 shadow-glow"
              disabled={loading}
            >
              {loading ? (
                t('auth.signingIn')
              ) : (
                <>
                  {t('auth.signInButton')}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>

          <p className="mt-16 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">
            MPMS · v1.0
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function FeatureDot({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/75">
      <span className="w-1.5 h-1.5 rounded-full bg-primary-300 shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
      {label}
    </div>
  )
}
