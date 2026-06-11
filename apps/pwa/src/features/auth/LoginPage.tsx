import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { buildSsoHash, consumeSsoHash } from './sso'
import { Button } from '../../components/ui/button'
import { Bus, ArrowRight } from 'lucide-react'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'http://localhost:5173'

const HERO_IMG =
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&q=80&auto=format&fit=crop'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Nhận phiên chuyển từ trang đăng nhập chung bên web admin
  useEffect(() => {
    const sso = consumeSsoHash()
    if (sso) {
      dispatch(setCredentials(sso))
      navigate('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      )
      if (!res.ok) {
        setError(t('auth.invalidCredentials'))
        return
      }
      const json = await res.json()
      const data = json && typeof json === 'object' && 'data' in json ? json.data : json
      // Admin đăng nhập ở app tài xế → chuyển phiên sang web admin
      if (data.role === 'ADMIN' || data.role === 'SYSTEM_ADMIN') {
        window.location.replace(`${WEB_URL}/login${buildSsoHash(data)}`)
        return
      }
      dispatch(setCredentials(data))
      navigate('/')
    } catch {
      setError(t('auth.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col p-6 relative overflow-hidden"
      style={{
        backgroundImage: `url('${HERO_IMG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/85 via-navy-900/90 to-navy-950/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.18),transparent_55%)]" />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[360px] flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white mb-6 shadow-glow">
            <Bus size={30} />
          </div>
          <h1 className="text-2xl font-extrabold text-white text-center tracking-tight">MPMS</h1>
          <p className="text-white/70 text-sm mb-8 text-center mt-1">
            {t('auth.busManagerPortal')}
          </p>

          <div className="w-full glass rounded-3xl p-6 shadow-card-hover">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] ml-1">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="driver@demo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] ml-1">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all font-medium"
                />
              </div>
              {error && (
                <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2.5">
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
                    {t('auth.signIn')}
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>

      <p className="relative z-10 text-center text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] pb-4">
        MPMS · v1.0
      </p>
    </div>
  )
}
