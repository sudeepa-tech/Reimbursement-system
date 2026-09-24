import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, FilePlus2, ClipboardCheck, Settings2, Users,
  LogOut, Wallet, ChevronDown, Bell, Search
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, initials } from '../utils/format'

const NAV_BY_ROLE = {
  employee: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/submit', label: 'Submit Expense', icon: FilePlus2 },
    { to: '/my-expenses', label: 'My Claims', icon: Receipt }
  ],
  manager: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/approvals', label: 'Approval Queue', icon: ClipboardCheck },
    { to: '/submit', label: 'Submit Expense', icon: FilePlus2 },
    { to: '/my-expenses', label: 'My Claims', icon: Receipt },
    { to: '/team', label: 'My Team', icon: Users }
  ],
  finance_manager: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/approvals', label: 'Approval Queue', icon: ClipboardCheck },
    { to: '/all-expenses', label: 'All Claims', icon: Receipt },
    { to: '/submit', label: 'Submit Expense', icon: FilePlus2 },
    { to: '/config', label: 'Approval Rules', icon: Settings2 }
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/approvals', label: 'Final Approvals', icon: ClipboardCheck },
    { to: '/all-expenses', label: 'All Claims', icon: Receipt },
    { to: '/config', label: 'Approval Rules', icon: Settings2 },
    { to: '/team', label: 'Employees', icon: Users }
  ]
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.employee

  return (
    <div className="min-h-screen flex bg-[#f6f7f9]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-ink-950 text-white flex flex-col fixed h-screen z-20">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/40">
            <Wallet size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-[15px] tracking-tight">ReimbursePro</p>
            <p className="text-[10px] text-white/40 font-medium">Enterprise Edition</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: user.avatarColor || '#2563eb' }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[11px] text-white/40 truncate">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-white/40 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/10"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-ink-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-ink-400 bg-ink-50 rounded-lg px-3 py-2 w-80">
            <Search size={15} />
            <span className="text-sm">Search claims, employees…</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-ink-400 hover:text-ink-700 transition-colors">
              <Bell size={19} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="h-8 w-px bg-ink-100" />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ backgroundColor: user.avatarColor || '#2563eb' }}
              >
                {initials(user.name)}
              </div>
              <div className="text-sm leading-tight">
                <p className="font-semibold text-ink-800">{user.name.split(' ')[0]}</p>
              </div>
              <ChevronDown size={14} className="text-ink-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
