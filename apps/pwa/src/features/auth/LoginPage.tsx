import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { buildSsoHash, consumeSsoHash } from './sso'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Bus, ArrowRight, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

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
      className="min-h-screen flex flex-col p-6 relative overflow-hidden bg-navy-950"
      // Tránh tai thỏ che nội dung trên iPhone (safe-area-inset-top)
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
    >
      {/* Lớp ảnh nền: hiệu ứng Ken Burns nhẹ lúc vào trang (chỉ transform — GPU friendly) */}
      <motion.div
        aria-hidden="true"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${HERO_IMG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Phủ navy đậm dần xuống dưới để chữ trắng đạt độ tương phản */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/85 via-navy-900/90 to-navy-950/95" />
      {/* Quầng sáng cyan phía trên */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
      {/* Aurora trôi chậm trên ảnh — chất điện ảnh nhưng rất nhẹ */}
      <div className="absolute inset-0 bg-aurora animate-aurora" />
      {/* Vignette: tối dần ra rìa để mắt tập trung vào thẻ đăng nhập */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.5)_100%)]" />
      {/* Hai quầng mờ lơ lửng tạo chiều sâu (blur lớn, chỉ transform — không gây repaint) */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl animate-float pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-8 -left-28 h-72 w-72 rounded-full bg-primary-400/10 blur-3xl animate-float [animation-delay:-2.5s] pointer-events-none"
      />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center">
        <div className="w-full max-w-[360px] flex flex-col items-center">
          {/* Logo: pop-in lò xo + quầng sáng xanh */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-b from-primary-500 to-primary-700 ring-1 ring-white/25 flex items-center justify-center text-white mb-6 shadow-glow"
          >
            <Bus size={30} aria-hidden="true" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
            className="flex flex-col items-center"
          >
            {/* Tiêu đề: gradient trắng → xanh nhạt clip vào chữ, vẫn đạt tương phản trên nền navy */}
            <h1 className="font-display text-3xl font-bold text-center tracking-tight bg-gradient-to-br from-white via-white to-primary-200 bg-clip-text text-transparent">
              MPMS
            </h1>
            <p className="text-white/70 text-sm mb-8 text-center mt-1">
              {t('auth.busManagerPortal')}
            </p>
          </motion.div>

          {/* Thẻ kính: trượt vào bằng lò xo, hơi nảy — điểm nhấn của màn hình */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.14 }}
            className="relative w-full glass rounded-3xl p-6 shadow-card-hover"
          >
            {/* Đường sáng mảnh trên mép thẻ — chi tiết "kính bắt sáng" */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent"
            />
            {/* Vệt sáng quét ngang một lần sau khi thẻ vào — khoảnh khắc "kính lóe sáng" (chỉ transform) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
            >
              <motion.div
                initial={{ x: '-120%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.55 }}
                className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trường email: vào trễ hơn thẻ một nhịp; label đổi màu theo focus (group-focus-within) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.24 }}
                className="group space-y-1.5"
              >
                <label
                  htmlFor="login-email"
                  className="block text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] ml-1 transition-colors duration-200 group-focus-within:text-primary-600"
                >
                  {t('auth.email')}
                </label>
                {/* Icon đổi màu theo focus của input (peer) — glow do ring của Input đảm nhiệm */}
                <div className="relative">
                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="driver@demo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="peer h-12 pl-11 font-medium"
                  />
                  <Mail
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 peer-focus:text-primary-500"
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.3 }}
                className="group space-y-1.5"
              >
                <label
                  htmlFor="login-password"
                  className="block text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] ml-1 transition-colors duration-200 group-focus-within:text-primary-600"
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="peer h-12 pl-11 font-medium"
                  />
                  <Lock
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 peer-focus:text-primary-500"
                  />
                </div>
              </motion.div>

              {/* Lỗi đăng nhập: mở/đóng mượt theo chiều cao + rung nhẹ để gây chú ý */}
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <motion.p
                      animate={{ x: [0, -7, 7, -4, 4, 0] }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      role="alert"
                      className="flex items-start gap-2 text-sm font-medium text-danger-600 bg-danger-50 border border-danger-100 rounded-xl px-3.5 py-2.5"
                    >
                      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                      {error}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.36 }}
              >
                <Button
                  type="submit"
                  size="lg"
                  className="group w-full shadow-glow"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      {t('auth.signingIn')}
                    </>
                  ) : (
                    <>
                      {t('auth.signIn')}
                      <ArrowRight
                        size={18}
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
        className="relative z-10 text-center text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        MPMS · v1.0
      </motion.p>
    </div>
  )
}
