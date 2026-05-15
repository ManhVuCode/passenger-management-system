import { useState, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../auth/authSlice'
import { useNavigate } from 'react-router-dom'
import { LogOut, Key, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const name = useAppSelector((s) => s.auth.name) ?? 'Driver'
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
        className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm active:scale-95 transition-all"
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[280px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-br from-primary-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-primary-600/20">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-950 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{email}</p>
                  {role && (
                    <span className="inline-flex items-center mt-1 h-5 px-2 rounded-full bg-[#fff7ed] text-[#c2410c] text-[10px] font-bold uppercase tracking-wide">
                      {role.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => {
                  setShowChangePw(true)
                  setOpen(false)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Key size={15} className="text-gray-500" />
                </div>
                Change Password
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors mt-1"
              >
                <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center">
                  <LogOut size={15} className="text-danger-600" />
                </div>
                Sign Out
              </button>
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                MPMS · v1.0 · BusManager App
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
      setError('Passwords do not match')
      return
    }
    if (next.length < 6) {
      setError('Password must be at least 6 characters')
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
        setError(data.message ?? 'Failed to change password')
        return
      }
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError('Connection error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-950">Change Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-950" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-success-600 font-bold">✓ Password changed</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <PasswordField label="Current Password" value={current} onChange={setCurrent} />
            <PasswordField label="New Password" value={next} onChange={setNext} />
            <PasswordField label="Confirm New Password" value={confirm} onChange={setConfirm} />

            {error && <p className="text-danger-600 text-xs">{error}</p>}

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-600/90 active:scale-[0.98] transition-all mt-2"
            >
              Update Password
            </button>
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
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </label>
      <input
        type="password"
        required
        minLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm"
      />
    </div>
  )
}
