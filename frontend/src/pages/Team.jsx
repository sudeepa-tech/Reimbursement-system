import React, { useEffect, useState } from 'react'
import { Users, Mail } from 'lucide-react'
import api from '../api/client'
import { initials, ROLE_LABELS } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function Team() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const endpoint = user.role === 'manager' ? '/employees/team' : '/employees'
    api.get(endpoint).then(res => setUsers(res.data.team || res.data.users)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{user.role === 'manager' ? 'My Team' : 'Employees'}</h1>
        <p className="text-ink-500 text-sm mt-1">{users.length} people</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-ink-100 shadow-card p-5 flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: u.avatarColor }}
              >
                {initials(u.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-800 text-sm truncate">{u.name}</p>
                <p className="text-xs text-ink-400 truncate flex items-center gap-1"><Mail size={11} /> {u.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-bold uppercase bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">{ROLE_LABELS[u.role]}</span>
                  <span className="text-[10px] text-ink-400">{u.department}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
