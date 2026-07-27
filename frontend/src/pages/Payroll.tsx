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
        <h1 className="text-2xl font-bold text-[#1c2f4d]">My Payslips</h1>
        <div className="mt-8">
          <MyPayslips />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1c2f4d]">Payroll</h1>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[#1c2f4d] text-[#f4efe2]'
                : 'bg-white text-[#5a6a85] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]'
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
