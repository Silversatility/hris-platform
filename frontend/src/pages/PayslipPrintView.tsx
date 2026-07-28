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
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Spinner className="h-8 w-8 text-[#111827]" />
      </div>
    )
  }

  if (error || !payslip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <p className="text-sm text-red-500">{error ?? 'Payslip not found.'}</p>
        <Link to="/" className="text-sm font-semibold text-[#4f46e5] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!payslip.is_paid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f8fafc] px-4 text-center">
        <p className="text-sm text-[#6b7280]">
          This payslip isn't available to print yet — it can be printed once the salary for this
          pay cycle has been paid.
        </p>
        <Link to="/" className="text-sm font-semibold text-[#4f46e5] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const earnings = payslip.line_items.filter((item) => item.item_type === 'earning')
  const deductions = payslip.line_items.filter((item) => item.item_type === 'deduction')

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link to="/" className="text-sm font-semibold text-[#4f46e5] hover:underline">
            &larr; Back to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-5 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="flex items-start justify-between border-b border-[#e5e7eb] pb-6">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">HRIS Platform</h1>
              <p className="text-sm text-[#6b7280]">Payslip</p>
            </div>
            <div className="text-right text-sm text-[#6b7280]">
              <p>Pay Period</p>
              <p className="font-medium text-[#111827]">
                {payslip.pay_period_start} to {payslip.pay_period_end}
              </p>
              <p className="mt-1">Pay Date: {payslip.pay_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[#e5e7eb] py-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase">Employee</p>
              <p className="mt-1 font-medium text-[#111827]">{payslip.employee_display_name}</p>
              <p className="text-[#6b7280]">{payslip.employee_code}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase">Position</p>
              <p className="mt-1 font-medium text-[#111827]">{payslip.employee_job_title}</p>
              <p className="text-[#6b7280]">{payslip.employee_department}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6">
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
                Earnings
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Base Salary</span>
                  <span className="text-[#111827]">{payslip.base_salary}</span>
                </div>
                {earnings.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-[#6b7280]">{item.label}</span>
                    <span className="text-[#111827]">{item.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#e5e7eb] pt-2 font-semibold">
                  <span className="text-[#111827]">Gross Pay</span>
                  <span className="text-[#111827]">{payslip.gross_pay}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
                Deductions
              </h2>
              <div className="space-y-2 text-sm">
                {deductions.length > 0 ? (
                  deductions.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-[#6b7280]">{item.label}</span>
                      <span className="text-rose-600">-{item.amount}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6b7280]">None</p>
                )}
                <div className="flex justify-between border-t border-[#e5e7eb] pt-2 font-semibold">
                  <span className="text-[#111827]">Total Deductions</span>
                  <span className="text-[#111827]">{payslip.total_deductions}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#f9fafb] px-6 py-4 print:bg-transparent print:px-0">
            <span className="text-sm font-bold text-[#111827] uppercase">Net Pay</span>
            <span className="text-2xl font-bold text-[#111827]">{payslip.net_pay}</span>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-[#9ca3af]">
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
