import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import CategoryChip from '../components/CategoryChip'
import { formatCurrency, formatDate, CATEGORY_META, STATUS_META } from '../utils/format'

export default function ExpenseList({ title, subtitle, scope = 'mine' }) {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', category: '', search: '' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (filters.status) params.status = filters.status
    if (filters.category) params.category = filters.category
    if (filters.search) params.search = filters.search
    api.get('/expenses', { params }).then(res => {
      setExpenses(res.data.expenses)
      setPagination(res.data.pagination)
    }).finally(() => setLoading(false))
  }, [page, filters])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
        <p className="text-ink-500 text-sm mt-1">{subtitle}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2 flex-1 min-w-[220px]">
          <Search size={15} className="text-ink-400" />
          <input
            placeholder="Search by claim #, merchant, employee…"
            value={filters.search}
            onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1) }}
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400"
          />
        </div>
        <select
          value={filters.status}
          onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-600 focus-ring"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <select
          value={filters.category}
          onChange={e => { setFilters({ ...filters, category: e.target.value }); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-600 focus-ring"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-400 text-sm">Loading claims…</div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center">
            <Filter size={28} className="mx-auto text-ink-300 mb-3" />
            <p className="text-ink-500 text-sm font-medium">No claims match your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 text-xs border-b border-ink-100 bg-ink-50/50">
                <th className="px-6 py-3 font-medium">Claim #</th>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Merchant</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr
                  key={exp.id}
                  onClick={() => navigate(`/claims/${exp.id}`)}
                  className="border-b border-ink-50 last:border-0 hover:bg-brand-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3.5 font-mono text-xs text-ink-500">{exp.claimNumber}</td>
                  <td className="px-6 py-3.5 text-ink-800 font-medium">{exp.employeeName}</td>
                  <td className="px-6 py-3.5 text-ink-600">{exp.merchant}</td>
                  <td className="px-6 py-3.5"><CategoryChip category={exp.category} /></td>
                  <td className="px-6 py-3.5 font-semibold text-ink-900 tabular-nums">{formatCurrency(exp.totalAmount, exp.currency)}</td>
                  <td className="px-6 py-3.5 text-ink-500">{formatDate(exp.expenseDate)}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={exp.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-500">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} claims</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-ink-200 disabled:opacity-40 hover:bg-ink-50">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-ink-200 disabled:opacity-40 hover:bg-ink-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
