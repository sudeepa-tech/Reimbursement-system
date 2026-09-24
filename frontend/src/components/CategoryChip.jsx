import React from 'react'
import { CATEGORY_META } from '../utils/format'

export default function CategoryChip({ category }) {
  const meta = CATEGORY_META[category] || { label: category, color: '#475569', bg: '#f1f5f9' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  )
}
