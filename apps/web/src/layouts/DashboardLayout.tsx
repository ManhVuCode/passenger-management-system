import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../features/auth/authSlice'
import { Bus, MapPin, LogOut, Users, Shield, LayoutDashboard } from 'lucide-react'
import { cn } from '../lib/utils'
import { LanguageToggle } from '../components/LanguageToggle'
import ChatWidget from '../features/chat/components/ChatWidget'

type NavItem = {
  to: string
  labelKey: string
  icon: typeof Bus
  match: (path: string) => boolean
}

export default function DashboardLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const name = useAppSelector((s) => s.auth.name)
  const role = useAppSelector((s) => s.auth.role)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  const isSystemAdmin = role === 'SYSTEM_ADMIN'

  const navItems: NavItem[] = isSystemAdmin
    ? [
        {
          to: '/system',
          labelKey: 'nav.tenants',
          icon: Shield,
          match: (p) => p === '/' || p.startsWith('/system'),
        },
      ]
    : [
        {
          to: '/',
          labelKey: 'nav.dashboard',
          icon: LayoutDashboard,
          match: (p) => p === '/',
        },
        {
          to: '/trips',
          labelKey: 'nav.trips',
          icon: MapPin,
          match: (p) => p.startsWith('/trips'),
        },
        {
          to: '/buses',
          labelKey: 'nav.buses',
          icon: Bus,
          match: (p) => p.startsWith('/buses'),
        },
        {
          to: '/users',
          labelKey: 'nav.users',
          icon: Users,
          match: (p) => p.startsWith('/users'),
        },
      ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar kính navy đậm — gradient navy-900 → navy-950 với vầng aurora trôi nhẹ */}
      <aside className="w-[240px] fixed top-0 left-0 bottom-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 to-navy-950 border-r border-white/[0.06] shadow-inner-highlight-dark">
        {/* Vầng sáng trang trí phía sau, không nhận tương tác */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl animate-aurora"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 -right-24 h-64 w-64 rounded-full bg-primary-700/15 blur-3xl"
        />

        {/* Khối logo phát sáng */}
        <div className="relative h-16 px-5 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-glow-lg ring-1 ring-white/20">
            <Bus size={18} />
          </div>
          <div className="leading-tight">
            <span className="font-display font-bold tracking-tight text-sm block text-white">MPMS</span>
            <p className="text-[9px] text-navy-300 font-medium leading-none mt-0.5">
              Multi Passenger Mgmt
            </p>
          </div>
        </div>

        <nav className="relative p-4 flex flex-col gap-1 flex-1">
          <p className="px-2 text-[10px] font-bold text-navy-400 uppercase tracking-widest mb-2">
            {isSystemAdmin ? t('nav.platformAdmin') : t('nav.operationAdmin')}
          </p>

          {navItems.map(({ to, labelKey, icon: Icon, match }) => {
            const isActive = match(location.pathname)
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'relative h-10 px-3 rounded-xl flex items-center gap-3 text-sm font-medium group',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60',
                  isActive ? 'text-white' : 'text-navy-300 hover:text-white hover:bg-white/5',
                )}
              >
                {/* Pill active trượt mượt giữa các mục bằng layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-600/35 to-primary-500/10 ring-1 ring-primary-400/25"
                    aria-hidden="true"
                  >
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-primary-300 to-primary-500" />
                  </motion.div>
                )}
                <Icon
                  size={18}
                  className={cn(
                    'relative z-10 transition-colors duration-200',
                    isActive ? 'text-primary-300' : 'text-navy-400 group-hover:text-white',
                  )}
                />
                <span className="relative z-10">{t(labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="relative p-4 border-t border-white/[0.06]">
          {name && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-1 ring-white/20 flex items-center justify-center text-white text-xs font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-semibold text-navy-100 truncate">{name}</p>
                {role && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-navy-400 mt-0.5">
                    {role}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="px-2 pb-2">
            <LanguageToggle />
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'h-10 w-full px-3 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer',
              'text-navy-300 transition-colors duration-200',
              'hover:bg-danger-500/10 hover:text-danger-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/50',
            )}
          >
            <LogOut size={18} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-[240px] min-h-screen">
        {/* Chuyển trang nhẹ nhàng: fade + rise theo pathname */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Trợ lý tour — chỉ dành cho Admin (endpoint /chat giới hạn theo ADMIN) */}
      {role === 'ADMIN' && <ChatWidget />}
    </div>
  )
}
