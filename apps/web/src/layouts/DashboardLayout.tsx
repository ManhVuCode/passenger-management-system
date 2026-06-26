import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../features/auth/authSlice'
import {
  Bus,
  MapPin,
  LogOut,
  Users,
  Shield,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LanguageToggle } from '../components/LanguageToggle'

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

  // Thò/thụt trên desktop — ghi nhớ giữa các phiên.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1')
  // Ngăn kéo trên mobile (off-canvas) — mặc định đóng.
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0')
      return next
    })
  }

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  const isSystemAdmin = role === 'SYSTEM_ADMIN'

  const navItems: NavItem[] = isSystemAdmin
    ? [{ to: '/system', labelKey: 'nav.tenants', icon: Shield, match: (p) => p === '/' || p.startsWith('/system') }]
    : [
        { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, match: (p) => p === '/' },
        { to: '/trips', labelKey: 'nav.trips', icon: MapPin, match: (p) => p.startsWith('/trips') },
        { to: '/buses', labelKey: 'nav.buses', icon: Bus, match: (p) => p.startsWith('/buses') },
        { to: '/users', labelKey: 'nav.users', icon: Users, match: (p) => p.startsWith('/users') },
      ]

  // Lớp ẩn nhãn KHI thụt — chỉ áp dụng từ breakpoint lg trở lên, nên ngăn kéo mobile luôn hiện đủ nhãn.
  const hideOnCollapse = collapsed ? 'lg:hidden' : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Thanh trên cùng cho mobile — nút hamburger mở ngăn kéo. Ẩn từ lg. */}
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-navy-900 px-4 text-white shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label={t('nav.openMenu')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-200 hover:bg-white/10 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white">
            <Bus size={15} />
          </div>
          <span className="font-display text-sm font-bold tracking-tight">MPMS</span>
        </div>
      </header>

      {/* Nền mờ khi ngăn kéo mở (chỉ mobile) */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: ngăn kéo trượt trên mobile; cột cố định + thò/thụt trên desktop */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 to-navy-950 border-r border-white/[0.06] shadow-inner-highlight-dark',
          'w-[260px] transition-transform duration-300 ease-out lg:transition-[width]',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[240px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl animate-aurora"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 -right-24 h-64 w-64 rounded-full bg-primary-700/15 blur-3xl"
        />

        {/* Logo + nút thò/thụt (desktop) / nút đóng (mobile) */}
        <div className="relative h-16 px-4 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-glow-lg ring-1 ring-white/20">
            <Bus size={18} />
          </div>
          <div className={cn('leading-tight min-w-0 flex-1', hideOnCollapse)}>
            <span className="font-display font-bold tracking-tight text-sm block text-white">MPMS</span>
            <p className="text-[9px] text-navy-300 font-medium leading-none mt-0.5 truncate">
              Multi Passenger Mgmt
            </p>
          </div>
          {/* desktop: thò/thụt */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className={cn(
              'hidden lg:flex shrink-0 h-8 w-8 items-center justify-center rounded-lg text-navy-300 cursor-pointer',
              'transition-colors duration-200 hover:bg-white/10 hover:text-white',
              collapsed && 'lg:absolute lg:right-3',
            )}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          {/* mobile: đóng ngăn kéo */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={t('common.close')}
            className="lg:hidden shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="relative p-3 flex flex-col gap-1 flex-1">
          <p className={cn('px-2 text-[10px] font-bold text-navy-400 uppercase tracking-widest mb-2', hideOnCollapse)}>
            {isSystemAdmin ? t('nav.platformAdmin') : t('nav.operationAdmin')}
          </p>

          {navItems.map(({ to, labelKey, icon: Icon, match }) => {
            const isActive = match(location.pathname)
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? t(labelKey) : undefined}
                className={cn(
                  'relative h-10 rounded-xl flex items-center gap-3 px-3 text-sm font-medium group',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60',
                  collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
                  isActive ? 'text-white' : 'text-navy-300 hover:text-white hover:bg-white/5',
                )}
              >
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
                    'relative z-10 shrink-0 transition-colors duration-200',
                    isActive ? 'text-primary-300' : 'text-navy-400 group-hover:text-white',
                  )}
                />
                <span className={cn('relative z-10', hideOnCollapse)}>{t(labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="relative p-3 border-t border-white/[0.06]">
          {name && (
            <div className={cn('flex items-center gap-2.5 px-2 py-2 mb-2', hideOnCollapse)}>
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-1 ring-white/20 flex items-center justify-center text-white text-xs font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-semibold text-navy-100 truncate">{name}</p>
                {role && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-navy-400 mt-0.5">{role}</p>
                )}
              </div>
            </div>
          )}
          {name && collapsed && (
            <div
              title={name}
              className="hidden lg:flex mx-auto mb-2 h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-1 ring-white/20 items-center justify-center text-white text-xs font-bold"
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={cn('px-2 pb-2', hideOnCollapse)}>
            <LanguageToggle />
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? t('nav.signOut') : undefined}
            className={cn(
              'h-10 w-full rounded-xl flex items-center gap-3 px-3 text-sm font-medium cursor-pointer',
              'text-navy-300 transition-colors duration-200',
              'hover:bg-danger-500/10 hover:text-danger-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/50',
              collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={hideOnCollapse}>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      <main
        className={cn(
          'min-h-screen transition-[margin] duration-300 ease-out',
          collapsed ? 'lg:ml-[76px]' : 'lg:ml-[240px]',
        )}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
