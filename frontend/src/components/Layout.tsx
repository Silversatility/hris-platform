import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullScreenLoader from './FullScreenLoader'
import {
  CalendarIcon,
  ChevronDownIcon,
  DashboardIcon,
  LogoutIcon,
  PeopleIcon,
  SearchIcon,
  SettingsIcon,
  WalletIcon,
} from './icons'
import NotificationBell from './NotificationBell'

type IconComponent = ComponentType<{ className?: string }>

interface NavLinkEntry {
  type: 'link'
  to: string
  label: string
  icon: IconComponent
  end?: boolean
}

interface NavGroupEntry {
  type: 'group'
  label: string
  icon: IconComponent
  items: { to: string; label: string }[]
}

type NavEntry = NavLinkEntry | NavGroupEntry

const NAV_STRUCTURE: NavEntry[] = [
  { type: 'link', to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  {
    type: 'group',
    label: 'Workforce',
    icon: PeopleIcon,
    items: [
      { to: '/employees', label: 'Employees' },
      { to: '/departments', label: 'Departments' },
    ],
  },
  {
    type: 'group',
    label: 'Time Off',
    icon: CalendarIcon,
    items: [{ to: '/leave-requests', label: 'Leave Requests' }],
  },
  {
    type: 'group',
    label: 'Payroll',
    icon: WalletIcon,
    items: [{ to: '/payroll', label: 'Payroll' }],
  },
  { type: 'link', to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function initials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  }
  return email[0]?.toUpperCase() ?? '?'
}

function findActiveGroupLabel(pathname: string) {
  for (const entry of NAV_STRUCTURE) {
    if (entry.type === 'group' && entry.items.some((item) => pathname === item.to)) {
      return entry.label
    }
  }
  return null
}

function Layout() {
  const { user, logout, isLoggingOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    findActiveGroupLabel(location.pathname)
  )

  useEffect(() => {
    const activeGroup = findActiveGroupLabel(location.pathname)
    if (activeGroup) setOpenGroup(activeGroup)
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const displayName =
    user && (user.first_name || user.last_name)
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.email

  return (
    <div className="flex min-h-screen bg-[#f4efe2]">
      {isLoggingOut && <FullScreenLoader />}
      <aside className="flex w-64 flex-col bg-gradient-to-b from-[#1c2f4d] to-[#0d1b30] text-[#dbe3ef]">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dbe3ef] text-sm font-bold text-[#1c2f4d]">
            H
          </span>
          <span className="text-lg font-bold text-white">HRIS Platform</span>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm text-[#b7c2d6]">
            <SearchIcon className="h-4 w-4" />
            <span>Search</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV_STRUCTURE.map((entry) => {
            if (entry.type === 'link') {
              const { to, label, icon: Icon, end } = entry
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-[#b7c2d6] hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5" />
                  {label}
                </NavLink>
              )
            }

            const { label, icon: Icon, items } = entry
            const isOpen = openGroup === label
            const isGroupActive = items.some((item) => location.pathname === item.to)

            return (
              <div key={label}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : label)}
                  className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    isGroupActive
                      ? 'bg-white/15 text-white'
                      : 'text-[#b7c2d6] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                    isOpen ? 'max-h-40' : 'max-h-0'
                  }`}
                >
                  <div className="mt-1 space-y-1 pl-8">
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-white/15 text-white'
                              : 'text-[#b7c2d6] hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
            <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe3ef] text-sm font-bold text-[#1c2f4d]">
                {user ? initials(user.first_name, user.last_name, user.email) : '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-[#93a2bc]">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Log out"
              className="rounded-full p-2 text-[#b7c2d6] hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogoutIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-end border-b border-black/5 bg-white px-6 py-3">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
