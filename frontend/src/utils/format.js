export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '—'
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const CATEGORY_META = {
  travel: { label: 'Travel & Airfare', color: '#2563eb', bg: '#eff6ff' },
  accommodation: { label: 'Accommodation', color: '#7c3aed', bg: '#f5f3ff' },
  meals: { label: 'Meals & Entertainment', color: '#d97706', bg: '#fffbeb' },
  transport: { label: 'Local Transport', color: '#0891b2', bg: '#ecfeff' },
  office_supplies: { label: 'Office Supplies', color: '#4d7c0f', bg: '#f7fee7' },
  software: { label: 'Software & Subscriptions', color: '#be185d', bg: '#fdf2f8' },
  client_entertainment: { label: 'Client Entertainment', color: '#b91c1c', bg: '#fef2f2' },
  training: { label: 'Training & Conferences', color: '#0f766e', bg: '#f0fdfa' },
  misc: { label: 'Miscellaneous', color: '#475569', bg: '#f8fafc' }
}

export const STATUS_META = {
  pending_l1: { label: 'Pending · Manager', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  pending_l2: { label: 'Pending · Finance', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  pending_l3: { label: 'Pending · Director', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  approved: { label: 'Approved', color: '#166534', bg: '#dcfce7', dot: '#22c55e' },
  rejected: { label: 'Rejected', color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
  reimbursed: { label: 'Reimbursed', color: '#1e3a8a', bg: '#dbeafe', dot: '#3b82f6' }
}

export const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  finance_manager: 'Finance Manager',
  admin: 'Administrator'
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
