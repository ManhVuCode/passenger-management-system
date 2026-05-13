import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../features/auth/authSlice'
import { Bus, MapPin, LogOut, User } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function DashboardLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const name = useAppSelector((s) => s.auth.name)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  const navItems = [
    { to: '/trips', label: 'Trips', icon: MapPin },
    { to: '/buses', label: 'Buses', icon: Bus },
  ]

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-primary text-lg leading-tight">
            Passenger<br />Management
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <User size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 truncate">{name}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
