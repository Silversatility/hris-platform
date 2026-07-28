import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import LeaveRequestFormModal from '../components/LeaveRequestFormModal'
import { ChevronDownIcon, PlusIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type {
  LeaveBalanceRecord,
  LeaveRequestRecord,
  LeaveTypeRecord,
  PaginatedResponse,
} from '../types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-700',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

function requestsUrl(status: string) {
  return status ? `/api/leave-requests/?status=${status}` : '/api/leave-requests/'
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data: unknown = err.response.data
    if (Array.isArray(data)) return data.join(' ')
    if (typeof data === 'object' && data !== null) {
      return Object.values(data as Record<string, string[] | string>)
        .map((messages) => (Array.isArray(messages) ? messages.join(' ') : messages))
        .join(' — ')
    }
  }
  return 'Something went wrong. Please try again.'
}

function LeaveRequests() {
  const { user } = useAuth()
  const myEmployeeId = user?.employee?.id ?? null

  const [statusFilter, setStatusFilter] = useState('')
  const [url, setUrl] = useState(() => requestsUrl(''))
  const [data, setData] = useState<PaginatedResponse<LeaveRequestRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRecord[]>([])
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadRequests = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<LeaveRequestRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load leave requests.'))
      .finally(() => setIsLoading(false))
  }, [url])

  const loadBalances = useCallback(() => {
    if (!myEmployeeId) return
    apiClient
      .get<PaginatedResponse<LeaveBalanceRecord>>(
        `/api/leave-balances/?employee=${myEmployeeId}&year=${new Date().getFullYear()}`
      )
      .then((response) => setBalances(response.data.results))
      .catch(() => setBalances([]))
  }, [myEmployeeId])

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<LeaveTypeRecord>>('/api/leave-types/')
      .then((response) => setLeaveTypes(response.data.results))
      .catch(() => setLeaveTypes([]))
  }, [])

  useEffect(() => {
    setUrl(requestsUrl(statusFilter))
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    loadBalances()
  }, [loadBalances])

  async function handleApprove(request: LeaveRequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/leave-requests/${request.id}/approve/`)
      loadRequests()
      loadBalances()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  async function handleReject(request: LeaveRequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/leave-requests/${request.id}/reject/`)
      loadRequests()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  async function handleCancel(request: LeaveRequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/leave-requests/${request.id}/cancel/`)
      loadRequests()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1c2f4d]">Leave Requests</h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-full bg-white py-2 pr-11 pl-4 text-sm text-[#1c2f4d] shadow-sm ring-1 ring-[#e7ded0] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#5a6a85]" />
          </div>

          {myEmployeeId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-4 py-2 text-sm font-bold text-[#f4efe2] shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Request Leave
            </button>
          )}
        </div>
      </div>

      {myEmployeeId && balances.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((balance) => (
            <section
              key={balance.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">
                {balance.leave_type_name}
              </h2>
              <p className="mt-2 text-2xl font-bold text-[#1c2f4d]">
                {balance.remaining_days}
                <span className="text-sm font-normal text-[#5a6a85]"> / {balance.allocated_days} days left</span>
              </p>
            </section>
          ))}
        </div>
      )}

      {actionError && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {actionError}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#1c2f4d]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-b from-[#1c2f4d] to-[#0d1b30] text-xs font-semibold text-[#dbe3ef] uppercase">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Leave Type</th>
                    <th className="px-6 py-3">Dates</th>
                    <th className="px-6 py-3">Days</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Reviewed By</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece0]">
                  {data.results.map((request) => {
                    const isMine = myEmployeeId !== null && request.employee === myEmployeeId
                    const isPending = request.status === 'pending'
                    return (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-[#1c2f4d]">
                          {request.employee_display_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {request.leave_type_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {request.start_date} — {request.end_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {request.days_requested}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              STATUS_STYLES[request.status] ?? 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {request.reviewed_by_name ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isPending && isMine && (
                            <button
                              onClick={() => handleCancel(request)}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-[#5a6a85] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
                            >
                              Cancel
                            </button>
                          )}
                          {isPending && !isMine && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request)}
                                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#f0ece0] px-6 py-4 text-sm text-[#5a6a85]">
              <span>
                {data.count} request{data.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => data.previous && setUrl(data.previous)}
                  disabled={!data.previous}
                  className="rounded-full px-3 py-1.5 font-medium text-[#1c2f4d] ring-1 ring-[#e7ded0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => data.next && setUrl(data.next)}
                  disabled={!data.next}
                  className="rounded-full px-3 py-1.5 font-medium text-[#1c2f4d] ring-1 ring-[#e7ded0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-[#5a6a85]">No leave requests found.</p>
        )}
      </div>

      <LeaveRequestFormModal
        isOpen={isModalOpen}
        leaveTypes={leaveTypes}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadRequests}
      />
    </div>
  )
}

export default LeaveRequests
