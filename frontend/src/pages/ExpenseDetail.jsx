import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle2, XCircle, Sparkles, Download, Building2, Calendar,
  Hash, CreditCard, Receipt as ReceiptIcon, MessageSquare
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import CategoryChip from '../components/CategoryChip'
import ExtractionStepTimeline from '../components/ExtractionStepTimeline'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'

export default function ExpenseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  function load() {
    setLoading(true)
    api.get(`/expenses/${id}`).then(res => setExpense(res.data.expense)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function decide(action) {
    if (action === 'rejected' && !comment.trim()) {
      toast.error('Please add a comment explaining the rejection.')
      return
    }
    setDeciding(true)
    try {
      await api.post(`/expenses/${id}/decision`, { action, comment })
      toast.success(action === 'approved' ? 'Claim approved' : 'Claim rejected')
      load()
      setComment('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process decision.')
    } finally {
      setDeciding(false)
    }
  }

  async function markReimbursed() {
    setDeciding(true)
    try {
      await api.post(`/expenses/${id}/reimburse`)
      toast.success('Marked as reimbursed')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark as reimbursed.')
    } finally {
      setDeciding(false)
    }
  }

  if (loading || !expense) {
    return <div className="flex items-center justify-center h-96 text-ink-400">Loading claim…</div>
  }

  const roleLevel = { manager: 1, finance_manager: 2, admin: 3 }
  const currentLevel = expense.status.startsWith('pending_l') ? parseInt(expense.status.slice(-1)) : null;
  const canDecide = currentLevel && roleLevel[user.role] === currentLevel &&
    (user.role === 'admin' ||
      (user.role === 'manager' && expense.managerId === user.id) ||
      (user.role === 'finance_manager' && expense.financeManagerId === user.id));
  const canReimburse = expense.status === 'approved' && ['finance_manager', 'admin'].includes(user.role);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{expense.claimNumber}</h1>
            <StatusBadge status={expense.status} />
          </div>
          <p className="text-ink-500 text-sm mt-1.5">Submitted by {expense.employeeName} ({expense.employeeCode}) · {expense.department}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-ink-900 tabular-nums">{formatCurrency(expense.totalAmount, expense.currency)}</p>
          <CategoryChip category={expense.category} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
            <h3 className="font-semibold text-ink-800 text-sm mb-4">Claim Details</h3>
            <div className="grid grid-cols-2 gap-5">
              <DetailField icon={Building2} label="Merchant / Vendor" value={expense.merchant} />
              <DetailField icon={Calendar} label="Expense Date" value={formatDate(expense.expenseDate)} />
              <DetailField icon={Hash} label="Invoice Number" value={expense.invoiceNumber || '—'} />
              <DetailField icon={CreditCard} label="Tax / GST" value={expense.taxAmount ? formatCurrency(expense.taxAmount, expense.currency) : 'Not itemized'} />
            </div>
            {expense.description && (
              <div className="mt-5 pt-5 border-t border-ink-100">
                <p className="text-xs font-medium text-ink-400 mb-1.5">Description</p>
                <p className="text-sm text-ink-700">{expense.description}</p>
              </div>
            )}
            {expense.receiptFile && (
              <div className="mt-5 pt-5 border-t border-ink-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ink-50 flex items-center justify-center">
                  <ReceiptIcon size={17} className="text-ink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{expense.receiptFile.fileName}</p>
                  <p className="text-xs text-ink-400">{expense.receiptFile.fileType}</p>
                </div>
                <Download size={15} className="text-ink-400" />
              </div>
            )}
          </div>

          {/* AI Extraction trail */}
          {expense.ocrExtraction && (
            <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
              <button onClick={() => setShowSteps(!showSteps)} className="flex items-center justify-between w-full">
                <h3 className="font-semibold text-ink-800 text-sm flex items-center gap-2">
                  <Sparkles size={15} className="text-brand-600" /> AI Extraction Summary
                </h3>
                <span className="text-xs font-semibold text-brand-600">
                  {Math.round(expense.ocrExtraction.confidence * 100)}% confidence · {showSteps ? 'Hide' : 'Show'} details
                </span>
              </button>
              {showSteps && expense.ocrExtraction.extractedFields && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(expense.ocrExtraction.extractedFields).map(([k, v]) => (
                    <div key={k} className="bg-ink-50 rounded-lg px-3 py-2">
                      <span className="text-ink-400 block capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-ink-800 font-mono font-medium">{v?.toString() || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approval history */}
          <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
            <h3 className="font-semibold text-ink-800 text-sm mb-4">Approval Timeline</h3>
            <div className="space-y-4">
              <TimelineEntry title="Claim Submitted" sub={expense.employeeName} timestamp={expense.submittedAt} state="done" />
              {expense.approvalHistory.map((h, idx) => (
                <TimelineEntry
                  key={idx}
                  title={`${h.action === 'approved' ? 'Approved' : 'Rejected'} by ${h.approverName}`}
                  sub={h.comment || `Level ${h.level} · ${h.role.replace('_', ' ')}`}
                  timestamp={h.timestamp}
                  state={h.action === 'approved' ? 'done' : 'rejected'}
                />
              ))}
              {expense.status.startsWith('pending_l') && (
                <TimelineEntry title="Awaiting Approval" sub={`Level ${currentLevel} approver`} state="pending" />
              )}
              {expense.status === 'reimbursed' && (
                <TimelineEntry title="Payment Processed" sub={`Reference: ${expense.paymentReference}`} timestamp={expense.reimbursedAt} state="done" />
              )}
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-5">
          {canDecide && (
            <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6 sticky top-24">
              <h3 className="font-semibold text-ink-800 text-sm mb-3">Your Decision</h3>
              <textarea
                value={comment} onChange={e => setComment(e.target.value)} rows={3}
                placeholder="Add a comment (required for rejection)…"
                className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring resize-none mb-3"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => decide('rejected')} disabled={deciding}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 disabled:opacity-50"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={() => decide('approved')} disabled={deciding}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> Approve
                </button>
              </div>
            </div>
          )}

          {canReimburse && (
            <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
              <h3 className="font-semibold text-ink-800 text-sm mb-2">Process Payment</h3>
              <p className="text-xs text-ink-500 mb-4">This claim is fully approved and ready for reimbursement.</p>
              <button
                onClick={markReimbursed} disabled={deciding}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
              >
                Mark as Reimbursed
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
            <h3 className="font-semibold text-ink-800 text-sm mb-3">Approval Chain</h3>
            <div className="space-y-2.5">
              {expense.approverChain.map((role, idx) => {
                const level = idx + 1
                const isDone = expense.approvalHistory.some(h => h.level === level)
                const isCurrent = currentLevel === level
                return (
                  <div key={idx} className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-400 text-white' : 'bg-ink-100 text-ink-400'
                    }`}>{level}</span>
                    <span className={`text-sm ${isDone || isCurrent ? 'text-ink-800 font-medium' : 'text-ink-400'} capitalize`}>
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-ink-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-medium text-ink-800">{value}</p>
      </div>
    </div>
  )
}

function TimelineEntry({ title, sub, timestamp, state }) {
  const colors = { done: 'bg-emerald-500', rejected: 'bg-rose-500', pending: 'bg-amber-400' }
  return (
    <div className="flex gap-3">
      <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${colors[state]}`} />
      <div>
        <p className="text-sm font-medium text-ink-800">{title}</p>
        <p className="text-xs text-ink-400">{sub}</p>
        {timestamp && <p className="text-[11px] text-ink-300 mt-0.5">{formatDateTime(timestamp)}</p>}
      </div>
    </div>
  )
}
