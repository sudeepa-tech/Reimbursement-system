import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Wallet, Clock, CheckCircle2, XCircle, TrendingUp, Sparkles } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import CategoryChip from '../components/CategoryChip'
import { formatCurrency, formatDate, CATEGORY_META, ROLE_LABELS } from '../utils/format'

const PIE_COLORS = ['#2563eb', '#7c3aed', '#d97706', '#0891b2', '#4d7c0f', '#be185d', '#b91c1c', '#0f766e', '#475569']

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/recent-activity')
    ]).then(([s, a]) => {
      setSummary(s.data)
      setActivity(a.data.activity)
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !summary) {
    return <div className="flex items-center justify-center h-96 text-ink-400">Loading dashboard…</div>
  }

  const { totals, byCategory, byDepartment, monthlyTrend, topSpenders } = summary

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            {ROLE_LABELS[user.role]} overview · {user.department} Department
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Claims" value={totals.totalClaims}
          sub={formatCurrency(totals.totalAmount)}
          icon={Wallet} accent="#2563eb"
        />
        <StatCard
          label="Pending Approval" value={totals.pendingCount}
          sub={formatCurrency(totals.pendingAmount)}
          icon={Clock} accent="#d97706"
        />
        <StatCard
          label="Reimbursed" value={totals.reimbursedCount}
          sub={formatCurrency(totals.reimbursedAmount)}
          icon={CheckCircle2} accent="#16a34a"
        />
        <StatCard
          label="Avg. Approval Time" value={`${totals.avgApprovalHours}h`}
          sub={`${totals.rejectedCount} claims rejected`}
          icon={TrendingUp} accent="#7c3aed"
        />
      </div>

      {/* AI Insight Banner */}
      {totals.avgOcrConfidence !== null && (
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-5 flex items-center gap-4 text-white shadow-lg shadow-brand-900/10">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles size={19} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">AI extraction is running at {totals.avgOcrConfidence}% average confidence</p>
            <p className="text-white/70 text-xs mt-0.5">Across all claims where receipts were processed through the OCR engine</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-semibold text-ink-800 text-sm mb-1">Spend Trend</h3>
          <p className="text-ink-400 text-xs mb-5">Monthly claim volume over the last 6 months</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [name === 'amount' ? formatCurrency(value) : value, name === 'amount' ? 'Amount' : 'Claims']}
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-semibold text-ink-800 text-sm mb-1">By Category</h3>
          <p className="text-ink-400 text-xs mb-4">Share of total claim value</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byCategory} dataKey="amount" nameKey="category"
                innerRadius={55} outerRadius={85} paddingAngle={2}
              >
                {byCategory.map((entry, idx) => (
                  <Cell key={entry.category} fill={CATEGORY_META[entry.category]?.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
            {byCategory.slice(0, 5).map(c => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c.category]?.color }} />
                  {CATEGORY_META[c.category]?.label || c.category}
                </span>
                <span className="font-semibold text-ink-800 tabular-nums">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-semibold text-ink-800 text-sm mb-1">By Department</h3>
          <p className="text-ink-400 text-xs mb-5">Total claim value by department</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDepartment} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="amount" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-semibold text-ink-800 text-sm mb-4">Top Claimants</h3>
          <div className="space-y-3">
            {topSpenders.map((s, idx) => (
              <div key={s.employeeName} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center text-[11px] font-bold text-ink-500 shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{s.employeeName}</p>
                  <p className="text-[11px] text-ink-400">{s.count} claims</p>
                </div>
                <span className="text-sm font-semibold text-ink-900 tabular-nums">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800 text-sm">Recent Activity</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-400 text-xs border-b border-ink-100">
              <th className="px-6 py-3 font-medium">Claim</th>
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.map(exp => (
              <tr key={exp.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50 transition-colors">
                <td className="px-6 py-3.5 font-mono text-xs text-ink-500">{exp.claimNumber}</td>
                <td className="px-6 py-3.5 text-ink-800">{exp.employeeName}</td>
                <td className="px-6 py-3.5"><CategoryChip category={exp.category} /></td>
                <td className="px-6 py-3.5 font-semibold text-ink-900 tabular-nums">{formatCurrency(exp.totalAmount, exp.currency)}</td>
                <td className="px-6 py-3.5 text-ink-500">{formatDate(exp.expenseDate)}</td>
                <td className="px-6 py-3.5"><StatusBadge status={exp.status} size="sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
