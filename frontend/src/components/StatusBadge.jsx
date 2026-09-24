import React from 'react'
import { STATUS_META } from '../utils/format'

export default function StatusBadge({ status, size = 'md' }) {
  const meta = STATUS_META[status] || { label: status, color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' }
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding}`}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  )
}
