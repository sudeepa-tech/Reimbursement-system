import React from 'react'

export default function StatCard({ label, value, sub, icon: Icon, accent = '#2563eb', trend }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-ink-500">{label}</span>
        {Icon && (
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-ink-900 tabular-nums tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs font-semibold ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-ink-400">{sub}</span>}
    </div>
  )
}
