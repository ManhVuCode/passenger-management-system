import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChangePasswordMutation } from './authApi'
import { Button } from '../../components/ui/button'
import { Lock, Check } from 'lucide-react'

const inputCls =
  'h-11 w-full rounded-xl border border-gray-200 px-4 font-medium text-navy-900 transition focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10'

/** Đổi mật khẩu của chính người đang đăng nhập (mọi role). Đặt trong trang Cài đặt /
 *  trang SystemAdmin — KHÔNG ở màn đăng nhập. */
export default function ChangePasswordCard() {
  const { t } = useTranslation()
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk(false)
    if (nw.length < 6) {
      setErr(t('auth.passwordTooShort'))
      return
    }
    if (nw !== cf) {
      setErr(t('auth.passwordMismatch'))
      return
    }
    try {
      await changePassword({ currentPassword: cur, newPassword: nw }).unwrap()
      setOk(true)
      setCur('')
      setNw('')
      setCf('')
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message
      setErr(typeof msg === 'string' ? msg : t('auth.failedChangePassword'))
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Lock size={16} />
        </div>
        <h3 className="font-display text-lg font-bold text-navy-900">{t('auth.changePassword')}</h3>
      </div>
      <form onSubmit={submit} className="max-w-md space-y-3">
        <input
          type="password"
          placeholder={t('auth.currentPassword')}
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          required
          autoComplete="current-password"
          className={inputCls}
        />
        <input
          type="password"
          placeholder={t('auth.newPassword')}
          value={nw}
          onChange={(e) => setNw(e.target.value)}
          required
          autoComplete="new-password"
          className={inputCls}
        />
        <input
          type="password"
          placeholder={t('auth.confirmPassword')}
          value={cf}
          onChange={(e) => setCf(e.target.value)}
          required
          autoComplete="new-password"
          className={inputCls}
        />
        {err && <p className="text-sm font-medium text-danger-600">{err}</p>}
        {ok && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success-600">
            <Check size={15} /> {t('auth.passwordChanged')}
          </p>
        )}
        <Button type="submit" disabled={isLoading} className="h-11">
          {isLoading ? '…' : t('auth.updatePassword')}
        </Button>
      </form>
    </div>
  )
}
