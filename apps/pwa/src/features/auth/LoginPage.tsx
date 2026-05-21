import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../store/hooks'
import { setCredentials } from './authSlice'
import { Button } from '../../components/ui/button'
import { Bus } from 'lucide-react'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      dispatch(setCredentials(data))
      navigate('/')
    } catch {
      setError(t('auth.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-primary-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-primary-600/20">
          <Bus size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-950 text-center leading-tight">MPMS</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">{t('auth.busManagerPortal')}</p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              inputMode="email"
              placeholder="driver@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
            />
          </div>
          {error && (
            <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-12 rounded-xl text-md" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>

        <p className="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          MPMS · v1.0
        </p>
      </motion.div>
    </div>
  )
}
