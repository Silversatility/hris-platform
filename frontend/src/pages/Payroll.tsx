import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import MyPayslips from './payroll/MyPayslips'
import PayRunsTab from './payroll/PayRunsTab'
import SalesAgentsTab from './payroll/SalesAgentsTab'
import SalesTab from './payroll/SalesTab'

type Tab = 'pay-runs' | 'agents' | 'sales'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pay-runs', label: 'Pay Runs' },
  { id: 'agents', label: 'Sales Agents' },
  { id: 'sales', label: 'Sales' },
]

function Payroll() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('pay-runs')

  if (!user?.is_staff) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-[#111827]">My Payslips</h1>
        <div className="mt-8">
          <MyPayslips />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#111827]">Payroll</h1>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[#4f46e5] text-[#f8fafc]'
                : 'bg-white text-[#6b7280] ring-1 ring-[#e5e7eb] hover:bg-[#f8fafc]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'pay-runs' && <PayRunsTab />}
        {tab === 'agents' && <SalesAgentsTab />}
        {tab === 'sales' && <SalesTab />}
      </div>
    </div>
  )
}

export default Payroll
