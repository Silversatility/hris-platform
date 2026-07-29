import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import COERequestFormModal from '../components/COERequestFormModal'
import { ChevronDownIcon, PlusIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { COERequestRecord, PaginatedResponse } from '../types'

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
  return status ? `/api/coe-requests/?status=${status}` : '/api/coe-requests/'
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

function COERequests() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)
  const myEmployeeId = user?.employee?.id ?? null

  const [statusFilter, setStatusFilter] = useState('')
  const [url, setUrl] = useState(() => requestsUrl(''))
  const [data, setData] = useState<PaginatedResponse<COERequestRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadRequests = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<COERequestRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load certificate requests.'))
      .finally(() => setIsLoading(false))
  }, [url])

  useEffect(() => {
    setUrl(requestsUrl(statusFilter))
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  async function handleApprove(request: COERequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/coe-requests/${request.id}/approve/`)
      loadRequests()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  async function handleReject(request: COERequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/coe-requests/${request.id}/reject/`)
      loadRequests()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  async function handleCancel(request: COERequestRecord) {
    setActionError(null)
    try {
      await apiClient.post(`/api/coe-requests/${request.id}/cancel/`)
      loadRequests()
    } catch (err) {
      setActionError(extractErrorMessage(err))
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111827]">Certificate of Employment</h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-full bg-white py-2 pr-11 pl-4 text-sm text-[#111827] shadow-sm ring-1 ring-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#4f46e5]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
          </div>

          {myEmployeeId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Request COE
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {actionError}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#111827]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e5e7eb] text-xs font-semibold text-[#9ca3af] uppercase">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Reviewed By</th>
                    <th className="px-6 py-3">Requested</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {data.results.map((request) => {
                    const isMine = myEmployeeId !== null && request.employee === myEmployeeId
                    const isPending = request.status === 'pending'
                    const isApproved = request.status === 'approved'
                    return (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-[#111827]">
                          {request.employee_display_name}
                        </td>
                        <td className="px-6 py-4 text-[#6b7280]">{request.purpose || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              STATUS_STYLES[request.status] ?? 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                          {request.reviewed_by_name ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {isApproved && (
                              <Link
                                to={`/coe-requests/${request.id}/print`}
                                className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4f46e5] hover:bg-[#e0e7ff]"
                              >
                                Print
                              </Link>
                            )}
                            {isPending && isMine && (
                              <button
                                onClick={() => handleCancel(request)}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-[#6b7280] ring-1 ring-[#e5e7eb] hover:bg-[#f8fafc]"
                              >
                                Cancel
                              </button>
                            )}
                            {isPending && isStaff && (
                              <>
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-4 text-sm text-[#6b7280]">
              <span>
                {data.count} request{data.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => data.previous && setUrl(data.previous)}
                  disabled={!data.previous}
                  className="rounded-full px-3 py-1.5 font-medium text-[#111827] ring-1 ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => data.next && setUrl(data.next)}
                  disabled={!data.next}
                  className="rounded-full px-3 py-1.5 font-medium text-[#111827] ring-1 ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-[#6b7280]">No certificate requests found.</p>
        )}
      </div>

      <COERequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadRequests}
      />
    </div>
  )
}

export default COERequests
