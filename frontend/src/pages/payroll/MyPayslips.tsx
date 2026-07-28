import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { apiClient } from '../../lib/apiClient'
import type { PaginatedResponse, PayslipRecord } from '../../types'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
}

function MyPayslips() {
  const [data, setData] = useState<PaginatedResponse<PayslipRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<PayslipRecord>>('/api/payslips/')
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load payslips.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white p-16 shadow-sm ring-1 ring-black/5">
        <Spinner className="h-8 w-8 text-[#1c2f4d]" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-red-500 shadow-sm ring-1 ring-black/5">
        {error}
      </p>
    )
  }

  if (!data || data.results.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#5a6a85] shadow-sm ring-1 ring-black/5">
        No payslips yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {data.results.map((payslip) => (
        <div
          key={payslip.id}
          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
        >
          <div className="flex w-full items-center justify-between px-6 py-4">
            <button
              onClick={() => setExpandedId(expandedId === payslip.id ? null : payslip.id)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-[#1c2f4d]">
                Payslip #{payslip.id} — Net Pay: {payslip.net_pay}
                {payslip.is_paid ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Paid via{' '}
                    {PAYMENT_METHOD_LABELS[payslip.payment_method] ?? payslip.payment_method}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Unpaid
                  </span>
                )}
              </span>
            </button>
            <div className="flex items-center gap-3">
              <Link
                to={`/payslips/${payslip.id}/print`}
                className="rounded-full px-3 py-1 text-xs font-semibold text-[#1c2f4d] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
              >
                Print
              </Link>
              <button
                onClick={() => setExpandedId(expandedId === payslip.id ? null : payslip.id)}
                className="text-xs text-[#5a6a85]"
              >
                {expandedId === payslip.id ? 'Hide' : 'View details'}
              </button>
            </div>
          </div>
          {expandedId === payslip.id && (
            <div className="border-t border-[#f0ece0] p-6">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#5a6a85]">Base Salary</dt>
                  <dd className="font-medium text-[#1c2f4d]">{payslip.base_salary}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#5a6a85]">Gross Pay</dt>
                  <dd className="font-medium text-[#1c2f4d]">{payslip.gross_pay}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#5a6a85]">Total Deductions</dt>
                  <dd className="font-medium text-[#1c2f4d]">{payslip.total_deductions}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#5a6a85]">Net Pay</dt>
                  <dd className="font-bold text-[#1c2f4d]">{payslip.net_pay}</dd>
                </div>
              </dl>
              {payslip.line_items.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-semibold text-[#5a6a85] uppercase">
                    Line Items
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {payslip.line_items.map((item) => (
                      <li key={item.id} className="flex justify-between text-[#5a6a85]">
                        <span>{item.label}</span>
                        <span className={item.item_type === 'deduction' ? 'text-rose-600' : ''}>
                          {item.item_type === 'deduction' ? '-' : '+'}
                          {item.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default MyPayslips
