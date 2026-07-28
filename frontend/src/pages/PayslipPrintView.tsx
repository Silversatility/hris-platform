import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { apiClient } from '../lib/apiClient'
import type { PayslipRecord } from '../types'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
}

function PayslipPrintView() {
  const { id } = useParams()
  const [payslip, setPayslip] = useState<PayslipRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<PayslipRecord>(`/api/payslips/${id}/`)
      .then((response) => setPayslip(response.data))
      .catch(() => setError('Could not load this payslip.'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe2]">
        <Spinner className="h-8 w-8 text-[#1c2f4d]" />
      </div>
    )
  }

  if (error || !payslip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4efe2]">
        <p className="text-sm text-red-500">{error ?? 'Payslip not found.'}</p>
        <Link to="/" className="text-sm font-semibold text-[#1c2f4d] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!payslip.is_paid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4efe2] px-4 text-center">
        <p className="text-sm text-[#5a6a85]">
          This payslip isn't available to print yet — it can be printed once the salary for this
          pay cycle has been paid.
        </p>
        <Link to="/" className="text-sm font-semibold text-[#1c2f4d] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const earnings = payslip.line_items.filter((item) => item.item_type === 'earning')
  const deductions = payslip.line_items.filter((item) => item.item_type === 'deduction')

  return (
    <div className="min-h-screen bg-[#f4efe2] p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link to="/" className="text-sm font-semibold text-[#1c2f4d] hover:underline">
            &larr; Back to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-5 py-2 text-sm font-bold text-[#f4efe2] shadow-sm"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="flex items-start justify-between border-b border-[#f0ece0] pb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1c2f4d]">HRIS Platform</h1>
              <p className="text-sm text-[#5a6a85]">Payslip</p>
            </div>
            <div className="text-right text-sm text-[#5a6a85]">
              <p>Pay Period</p>
              <p className="font-medium text-[#1c2f4d]">
                {payslip.pay_period_start} to {payslip.pay_period_end}
              </p>
              <p className="mt-1">Pay Date: {payslip.pay_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[#f0ece0] py-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-[#5a6a85] uppercase">Employee</p>
              <p className="mt-1 font-medium text-[#1c2f4d]">{payslip.employee_display_name}</p>
              <p className="text-[#5a6a85]">{payslip.employee_code}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5a6a85] uppercase">Position</p>
              <p className="mt-1 font-medium text-[#1c2f4d]">{payslip.employee_job_title}</p>
              <p className="text-[#5a6a85]">{payslip.employee_department}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6">
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
                Earnings
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5a6a85]">Base Salary</span>
                  <span className="text-[#1c2f4d]">{payslip.base_salary}</span>
                </div>
                {earnings.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-[#5a6a85]">{item.label}</span>
                    <span className="text-[#1c2f4d]">{item.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#f0ece0] pt-2 font-semibold">
                  <span className="text-[#1c2f4d]">Gross Pay</span>
                  <span className="text-[#1c2f4d]">{payslip.gross_pay}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
                Deductions
              </h2>
              <div className="space-y-2 text-sm">
                {deductions.length > 0 ? (
                  deductions.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-[#5a6a85]">{item.label}</span>
                      <span className="text-rose-600">-{item.amount}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#5a6a85]">None</p>
                )}
                <div className="flex justify-between border-t border-[#f0ece0] pt-2 font-semibold">
                  <span className="text-[#1c2f4d]">Total Deductions</span>
                  <span className="text-[#1c2f4d]">{payslip.total_deductions}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#faf6ec] px-6 py-4 print:bg-transparent print:px-0">
            <span className="text-sm font-bold text-[#1c2f4d] uppercase">Net Pay</span>
            <span className="text-2xl font-bold text-[#1c2f4d]">{payslip.net_pay}</span>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-[#93a2bc]">
            <span>Generated {new Date(payslip.generated_at).toLocaleString()}</span>
            <span>
              {payslip.is_paid
                ? `Paid via ${PAYMENT_METHOD_LABELS[payslip.payment_method] ?? payslip.payment_method}`
                : 'Unpaid'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PayslipPrintView
