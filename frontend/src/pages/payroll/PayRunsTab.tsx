import axios from 'axios'
import { Fragment, useCallback, useEffect, useState } from 'react'
import MarkPaidModal from '../../components/MarkPaidModal'
import PayRunFormModal from '../../components/PayRunFormModal'
import { PlusIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import { apiClient } from '../../lib/apiClient'
import type {
  CommissionPayoutRecord,
  PaginatedResponse,
  PayRunRecord,
  PayslipRecord,
} from '../../types'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
}

interface MarkPaidTarget {
  kind: 'payslip' | 'payout'
  id: number
  label: string
}

function extractXenditErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data: unknown = err.response.data
    if (Array.isArray(data)) return data.join(' ')
    if (typeof data === 'object' && data !== null) {
      return Object.values(data as Record<string, string[] | string>)
        .map((messages) => (Array.isArray(messages) ? messages.join(' ') : messages))
        .join(' — ')
    }
  }
  return 'Failed to pay out via Xendit.'
}

function PaidBadge({ record }: { record: { is_paid: boolean; payment_method: string } }) {
  if (!record.is_paid) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        Unpaid
      </span>
    )
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      Paid via {PAYMENT_METHOD_LABELS[record.payment_method] ?? record.payment_method}
    </span>
  )
}

function PayRunDetail({ payRun }: { payRun: PayRunRecord }) {
  const [payslips, setPayslips] = useState<PayslipRecord[]>([])
  const [payouts, setPayouts] = useState<CommissionPayoutRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markPaidTarget, setMarkPaidTarget] = useState<MarkPaidTarget | null>(null)
  const [xenditBusyId, setXenditBusyId] = useState<number | null>(null)
  const [xenditErrors, setXenditErrors] = useState<Record<number, string>>({})

  const loadDetail = useCallback(() => {
    setIsLoading(true)
    Promise.all([
      apiClient.get<PaginatedResponse<PayslipRecord>>(`/api/payslips/?pay_run=${payRun.id}`),
      apiClient.get<PaginatedResponse<CommissionPayoutRecord>>(
        `/api/commission-payouts/?pay_run=${payRun.id}`
      ),
    ])
      .then(([payslipsRes, payoutsRes]) => {
        setPayslips(payslipsRes.data.results)
        setPayouts(payoutsRes.data.results)
      })
      .finally(() => setIsLoading(false))
  }, [payRun.id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const canMarkPaid = payRun.status === 'completed'

  async function handlePayViaXendit(payout: CommissionPayoutRecord) {
    setXenditErrors((prev) => {
      const next = { ...prev }
      delete next[payout.id]
      return next
    })
    setXenditBusyId(payout.id)
    try {
      await apiClient.post(`/api/commission-payouts/${payout.id}/pay-via-xendit/`)
      loadDetail()
    } catch (err) {
      setXenditErrors((prev) => ({ ...prev, [payout.id]: extractXenditErrorMessage(err) }))
    } finally {
      setXenditBusyId(null)
    }
  }

  const markPaidEndpoint = markPaidTarget
    ? markPaidTarget.kind === 'payslip'
      ? `/api/payslips/${markPaidTarget.id}/mark-paid/`
      : `/api/commission-payouts/${markPaidTarget.id}/mark-paid/`
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Spinner className="h-6 w-6 text-[#1c2f4d]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
          Employee Payslips ({payslips.length})
        </h3>
        {payslips.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-[#f0ece0]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf6ec] text-xs font-semibold text-[#5a6a85] uppercase">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Base Salary</th>
                  <th className="px-4 py-2">Gross</th>
                  <th className="px-4 py-2">Deductions</th>
                  <th className="px-4 py-2">Net Pay</th>
                  <th className="px-4 py-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece0]">
                {payslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td className="px-4 py-2 text-[#1c2f4d]">
                      {payslip.employee_display_name} ({payslip.employee_code})
                    </td>
                    <td className="px-4 py-2 text-[#5a6a85]">{payslip.base_salary}</td>
                    <td className="px-4 py-2 text-[#5a6a85]">{payslip.gross_pay}</td>
                    <td className="px-4 py-2 text-[#5a6a85]">{payslip.total_deductions}</td>
                    <td className="px-4 py-2 font-medium text-[#1c2f4d]">{payslip.net_pay}</td>
                    <td className="px-4 py-2">
                      {payslip.is_paid ? (
                        <PaidBadge record={payslip} />
                      ) : canMarkPaid ? (
                        <button
                          onClick={() =>
                            setMarkPaidTarget({
                              kind: 'payslip',
                              id: payslip.id,
                              label: `${payslip.employee_display_name}'s payslip`,
                            })
                          }
                          className="rounded-full px-3 py-1 text-xs font-semibold text-[#1c2f4d] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <PaidBadge record={payslip} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#5a6a85]">No payslips generated yet.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
          Agent Commission Payouts ({payouts.length})
        </h3>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-[#f0ece0]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf6ec] text-xs font-semibold text-[#5a6a85] uppercase">
                <tr>
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2">Sales Counted</th>
                  <th className="px-4 py-2">Total Commission</th>
                  <th className="px-4 py-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece0]">
                {payouts.map((payout) => (
                  <Fragment key={payout.id}>
                    <tr>
                      <td className="px-4 py-2 text-[#1c2f4d]">{payout.agent_display_name}</td>
                      <td className="px-4 py-2 text-[#5a6a85]">{payout.line_items.length}</td>
                      <td className="px-4 py-2 font-medium text-[#1c2f4d]">
                        {payout.total_commission}
                      </td>
                      <td className="px-4 py-2">
                        {payout.is_paid ? (
                          <PaidBadge record={payout} />
                        ) : canMarkPaid ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                setMarkPaidTarget({
                                  kind: 'payout',
                                  id: payout.id,
                                  label: `${payout.agent_display_name}'s commission payout`,
                                })
                              }
                              className="rounded-full px-3 py-1 text-xs font-semibold text-[#1c2f4d] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handlePayViaXendit(payout)}
                              disabled={xenditBusyId === payout.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#1c2f4d] px-3 py-1 text-xs font-semibold text-[#f4efe2] hover:bg-[#0d1b30] disabled:opacity-50"
                            >
                              {xenditBusyId === payout.id && <Spinner className="h-3 w-3" />}
                              Pay via Xendit
                            </button>
                          </div>
                        ) : (
                          <PaidBadge record={payout} />
                        )}
                      </td>
                    </tr>
                    {xenditErrors[payout.id] && (
                      <tr>
                        <td colSpan={4} className="px-4 pb-2">
                          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {xenditErrors[payout.id]}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#5a6a85]">No commission payouts for this period.</p>
        )}
      </div>

      <MarkPaidModal
        isOpen={markPaidTarget !== null}
        title={markPaidTarget ? `Mark ${markPaidTarget.label} as paid` : ''}
        endpoint={markPaidEndpoint}
        onClose={() => setMarkPaidTarget(null)}
        onSaved={loadDetail}
      />
    </div>
  )
}

function PayRunsTab() {
  const [data, setData] = useState<PaginatedResponse<PayRunRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadPayRuns = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<PayRunRecord>>('/api/pay-runs/')
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load pay runs.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadPayRuns()
  }, [loadPayRuns])

  async function handleGenerate(payRun: PayRunRecord) {
    setActionError(null)
    setBusyId(payRun.id)
    try {
      await apiClient.post(`/api/pay-runs/${payRun.id}/generate/`)
      loadPayRuns()
    } catch {
      setActionError('Failed to generate payslips/payouts.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleComplete(payRun: PayRunRecord) {
    const confirmed = window.confirm(
      'Complete this pay run? Payslips and commission payouts become locked.'
    )
    if (!confirmed) return
    setActionError(null)
    setBusyId(payRun.id)
    try {
      await apiClient.post(`/api/pay-runs/${payRun.id}/complete/`)
      loadPayRuns()
    } catch {
      setActionError('Failed to complete pay run.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-4 py-2 text-sm font-bold text-[#f4efe2] shadow-sm"
        >
          <PlusIcon className="h-4 w-4" />
          New Pay Run
        </button>
      </div>

      {actionError && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {actionError}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#1c2f4d]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf6ec] text-xs font-semibold text-[#5a6a85] uppercase">
              <tr>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Pay Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Payslips</th>
                <th className="px-6 py-3">Payouts</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece0]">
              {data.results.map((payRun) => (
                <Fragment key={payRun.id}>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-[#1c2f4d]">
                      {payRun.start_date} — {payRun.end_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                      {payRun.pay_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLES[payRun.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {payRun.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                      {payRun.payslip_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                      {payRun.commission_payout_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === payRun.id ? null : payRun.id)
                          }
                          className="rounded-full px-3 py-1 text-xs font-semibold text-[#1c2f4d] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
                        >
                          {expandedId === payRun.id ? 'Hide' : 'View'}
                        </button>
                        {payRun.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleGenerate(payRun)}
                              disabled={busyId === payRun.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#f4efe2] px-3 py-1 text-xs font-semibold text-[#1c2f4d] hover:bg-[#ece4d3] disabled:opacity-50"
                            >
                              {busyId === payRun.id && <Spinner className="h-3 w-3" />}
                              Generate
                            </button>
                            <button
                              onClick={() => handleComplete(payRun)}
                              disabled={busyId === payRun.id}
                              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === payRun.id && (
                    <tr>
                      <td colSpan={6} className="bg-[#faf6ec]">
                        <PayRunDetail payRun={payRun} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-8 text-center text-sm text-[#5a6a85]">No pay runs found.</p>
        )}
      </div>

      <PayRunFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadPayRuns}
      />
    </div>
  )
}

export default PayRunsTab
