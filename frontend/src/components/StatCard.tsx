import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'

type StatCardColor = 'indigo' | 'gray' | 'amber' | 'rose'

const COLOR_STYLES: Record<StatCardColor, string> = {
  indigo: 'bg-[#ede9fe] text-[#7c3aed]',
  gray: 'bg-[#f3f4f6] text-[#4b5563]',
  amber: 'bg-[#fef3c7] text-[#d97706]',
  rose: 'bg-[#ffe4e6] text-[#e11d48]',
}

interface StatCardProps {
  label: string
  value: number | string
  icon: ComponentType<{ className?: string }>
  to?: string
  color?: StatCardColor
}

function StatCard({ label, value, icon: Icon, to, color = 'indigo' }: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e5e7eb] transition-colors hover:bg-[#f9fafb]">
      <div>
        <p className="text-xs font-semibold text-[#9ca3af] uppercase">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#111827]">{value}</p>
      </div>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${COLOR_STYLES[color]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

export default StatCard
