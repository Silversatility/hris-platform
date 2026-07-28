import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'

interface StatCardProps {
  label: string
  value: number | string
  icon: ComponentType<{ className?: string }>
  to?: string
}

function StatCard({ label, value, icon: Icon, to }: StatCardProps) {
  const content = (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-[#faf6ec]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4efe2] text-[#1c2f4d]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold text-[#1c2f4d]">{value}</p>
        <p className="text-xs font-semibold text-[#5a6a85] uppercase">{label}</p>
      </div>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

export default StatCard
