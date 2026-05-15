import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../features/auth/authSlice'
import { Bus, MapPin, LogOut, Users, Shield } from 'lucide-react'
import { cn } from '../lib/utils'

type NavItem = {
  to: string
  label: string
  icon: typeof Bus
  match: (path: string) => boolean
}

export default function DashboardLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
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
          label: 'Tenants',
          icon: Shield,
          match: (p) => p === '/' || p.startsWith('/system'),
        },
      ]
    : [
        {
          to: '/trips',
          label: 'Trips',
          icon: MapPin,
          match: (p) => p === '/' || p.startsWith('/trips'),
        },
        { to: '/buses', label: 'Buses', icon: Bus, match: (p) => p.startsWith('/buses') },
      ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-[220px] fixed top-0 left-0 bottom-0 bg-white border-r border-gray-200 flex flex-col z-50">
        <div className="h-14 px-5 flex items-center border-b border-gray-100 gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
            <Bus size={18} />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-gray-950 tracking-tight text-sm block">MPMS</span>
            <p className="text-[9px] text-gray-400 font-medium leading-none">
              Multi Passenger Mgmt
            </p>
          </div>
        </div>

        <nav className="p-4 flex flex-col gap-1 flex-1">
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {isSystemAdmin ? 'Platform Admin' : 'Operation Admin'}
          </p>

          {navItems.map(({ to, label, icon: Icon, match }) => {
            const isActive = match(location.pathname)
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'h-10 px-3 rounded-lg flex items-center gap-3 transition-colors text-sm font-medium relative group',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950',
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary-600 rounded-r-full" />
                )}
                <Icon size={18} className={isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-950'} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {name && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1 text-xs text-gray-500">
              <Users size={14} className="text-gray-400" />
              <span className="truncate">{name}</span>
              {role && <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-gray-400">{role}</span>}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="h-10 w-full px-3 rounded-lg flex items-center gap-3 text-gray-600 hover:bg-danger-50 hover:text-danger-600 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-[220px] min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
