import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Clock } from 'lucide-react'
import api from '../api/client'
import CategoryChip from '../components/CategoryChip'
import { formatCurrency, formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ApprovalQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/expenses/queue/pending').then(res => setExpenses(res.data.expenses)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Approval Queue</h1>
        <p className="text-ink-500 text-sm mt-1">
          {expenses.length} claim{expenses.length !== 1 ? 's' : ''} awaiting your decision as {user.role === 'admin' ? 'Final Approver' : user.role.replace('_', ' ')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink-400">Loading queue…</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck size={26} className="text-emerald-500" />
          </div>
          <p className="font-semibold text-ink-800">All caught up!</p>
          <p className="text-ink-500 text-sm mt-1">You have no pending claims to review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenses.map(exp => (
            <div
              key={exp.id}
              onClick={() => navigate(`/claims/${exp.id}`)}
              className="bg-white rounded-2xl border border-ink-100 shadow-card p-5 cursor-pointer hover:border-brand-300 hover:shadow-popover transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-ink-400">{exp.claimNumber}</p>
                  <p className="font-semibold text-ink-800 mt-1">{exp.employeeName}</p>
                  <p className="text-xs text-ink-500">{exp.department}</p>
                </div>
                <span className="text-lg font-bold text-ink-900 tabular-nums">{formatCurrency(exp.totalAmount, exp.currency)}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <CategoryChip category={exp.category} />
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Clock size={12} /> {timeAgo(exp.submittedAt)}
                </div>
              </div>
              <p className="text-xs text-ink-500 mt-2 truncate">{exp.merchant} · {formatDate(exp.expenseDate)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
