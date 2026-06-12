import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { buildSsoHash, consumeSsoHash } from './sso'
import { Button } from '../../components/ui/button'
import {
  Bus,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const PWA_URL = import.meta.env.VITE_PWA_URL ?? 'http://localhost:5174'

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

  // Nhận phiên chuyển từ PWA (admin lỡ đăng nhập bên app tài xế)
  useEffect(() => {
    const sso = consumeSsoHash()
    if (sso) {
      dispatch(setCredentials(sso))
      navigate(sso.role === 'SYSTEM_ADMIN' ? '/system' : '/', { replace: true })
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
      // Tài xế đăng nhập ở trang chung → chuyển phiên sang PWA tài xế
      if (data.role === 'BUS_MANAGER') {
        window.location.replace(`${PWA_URL}/login${buildSsoHash(data)}`)
        return
      }
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
      {/* ===== Panel hero bên trái — 60% desktop, ẩn trên mobile ===== */}
      <div className="hidden lg:flex relative w-[60%] overflow-hidden bg-navy-950">
        {/* Ảnh xe buýt — zoom chậm kiểu điện ảnh khi vào trang */}
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMG}')` }}
        />

        {/* Lớp phủ navy → primary giữ tương phản cho chữ trắng */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950/90 via-navy-900/75 to-primary-700/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.28),transparent_55%)]" />

        {/* Vầng aurora trôi chậm — hai quả cầu sáng nhoè lệch pha nhau */}
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-primary-500/25 blur-3xl animate-aurora" />
        <div
          className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-3xl animate-aurora"
          style={{ animationDelay: '-9s' }}
        />

        {/* Hạt sáng trôi nổi — điểm nhấn chuyển động nhẹ */}
        <div className="absolute top-[22%] right-[16%] h-2.5 w-2.5 rounded-full bg-primary-300/80 blur-[1px] animate-float" />
        <div
          className="absolute top-[38%] right-[30%] h-1.5 w-1.5 rounded-full bg-white/60 blur-[0.5px] animate-float"
          style={{ animationDelay: '-1.6s' }}
        />
        <div
          className="absolute bottom-[26%] left-[14%] h-2 w-2 rounded-full bg-cyan-300/60 blur-[1px] animate-float"
          style={{ animationDelay: '-2.8s' }}
        />
        <div
          className="absolute top-[14%] left-[42%] h-16 w-16 rounded-full border border-white/10 animate-float"
          style={{ animationDelay: '-0.8s' }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-14 text-white">
          {/* Logo khối gradient phát sáng — viền kính mảnh, đồng bộ với sidebar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-primary-400 to-primary-600 ring-1 ring-white/25 shadow-glow-lg">
              <Bus size={22} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">MPMS</span>
          </motion.div>

          <div className="space-y-7">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
              className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight bg-gradient-to-br from-white via-white to-primary-200 bg-clip-text text-transparent"
            >
              {t('auth.heroTitle')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
              className="max-w-md text-lg leading-relaxed text-white/80"
            >
              {t('auth.heroSubtitle')}
            </motion.p>

            {/* Ba điểm nhấn tính năng — vào lần lượt, chấm live đập nhịp */}
            <div className="flex items-center gap-7 pt-3">
              <FeatureDot label={t('auth.featureRealtime')} delay={0.28} />
              <FeatureDot label={t('auth.featureOffline')} delay={0.34} />
              <FeatureDot label={t('auth.featureMultitenant')} delay={0.4} />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50"
          >
            © {new Date().getFullYear()} MPMS · {t('auth.heroCaption')}
          </motion.div>
        </div>
      </div>

      {/* ===== Panel form bên phải — 40% desktop, full width mobile ===== */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gray-50 bg-aurora p-6 lg:p-12">
        {/* Vầng sáng nhoè góc trên — hơi thở cho nền trắng */}
        <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-primary-200/40 blur-3xl animate-aurora" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-[420px]"
        >
          {/* Logo cho mobile (hero bị ẩn) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-glow">
              <Bus size={22} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-navy-900">
              MPMS
            </span>
          </div>

          {/* Thẻ kính chứa form */}
          <div className="relative rounded-3xl bg-white/85 px-8 py-10 sm:px-10 shadow-float ring-1 ring-black/5 backdrop-blur-xl">
            {/* Viền sáng gradient mảnh phía trên thẻ */}
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
              className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-700 ring-1 ring-inset ring-primary-100"
            >
              <ShieldCheck size={13} />
              {t('auth.adminOperations')}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.14 }}
              className="mb-8 font-display text-3xl font-bold tracking-tight text-gradient"
            >
              {t('auth.signInHeading')}
            </motion.h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ô email — icon đổi màu + vạch gradient chạy ra khi focus */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
                className="group space-y-1.5"
              >
                <label
                  htmlFor="login-email"
                  className="ml-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 transition-colors duration-200 group-focus-within:text-primary-600"
                >
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-primary-500"
                  />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="admin@demo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 font-medium text-navy-900 shadow-sm placeholder:font-normal placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                  />
                  <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-primary-500 to-transparent transition-transform duration-300 group-focus-within:scale-x-100" />
                </div>
              </motion.div>

              {/* Ô mật khẩu — giữ nguyên toggle hiện/ẩn */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.26 }}
                className="group space-y-1.5"
              >
                <label
                  htmlFor="login-password"
                  className="ml-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 transition-colors duration-200 group-focus-within:text-primary-600"
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-primary-500"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-12 font-medium text-navy-900 shadow-sm placeholder:font-normal placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                    className="absolute inset-y-1.5 right-1.5 flex w-9 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-primary-500 to-transparent transition-transform duration-300 group-focus-within:scale-x-100" />
                </div>
              </motion.div>

              {/* Thông báo lỗi — trượt vào/ra mượt */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-start gap-2 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.32 }}
              >
                <Button
                  type="submit"
                  className="h-12 w-full gap-2 text-[15px]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('auth.signingIn')}
                    </>
                  ) : (
                    <>
                      {t('auth.signInButton')}
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-10 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400"
          >
            MPMS · v1.0
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}

// Điểm nhấn tính năng trên hero — chấm live đập nhịp + vòng sáng lan toả
function FeatureDot({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
      className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary-300 animate-ping-soft" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-300 shadow-[0_0_8px_rgba(125,211,252,0.9)] animate-pulse-soft" />
      </span>
      {label}
    </motion.div>
  )
}
