import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { consumeSsoHash } from './sso'
import { Bus, Loader2 } from 'lucide-react'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'http://localhost:5173'

// Trang đăng nhập chung của toàn hệ thống là trang login bên web admin.
// Route /login của PWA chỉ còn hai nhiệm vụ:
//   1. Nhận phiên tài xế chuyển sang từ trang đăng nhập chung (hash #sso=1&...)
//   2. Không có hash → chuyển hướng về trang đăng nhập chung
export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    const sso = consumeSsoHash()
    if (sso) {
      dispatch(setCredentials(sso))
      navigate('/', { replace: true })
      return
    }
    // Đã có phiên (vd StrictMode chạy effect lần 2 sau khi hash vừa được tiêu thụ,
    // hoặc user gõ thẳng /login) → vào app, không bật về trang đăng nhập chung
    if (localStorage.getItem('accessToken')) {
      navigate('/', { replace: true })
      return
    }
    window.location.replace(`${WEB_URL}/login`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Màn hình quá độ trong tích tắc trước khi trình duyệt rời trang
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 bg-navy-950"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-b from-primary-500 to-primary-700 ring-1 ring-white/25 flex items-center justify-center text-white shadow-glow"
      >
        <Bus size={30} aria-hidden="true" />
      </motion.div>
      <p className="flex items-center gap-2 text-white/70 text-sm font-medium">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {t('auth.redirectingToLogin')}
      </p>
    </div>
  )
}
