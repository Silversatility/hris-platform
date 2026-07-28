import axios from 'axios'
import { Fragment, useCallback, useEffect, useState } from 'react'
import TicketFormModal from '../components/TicketFormModal'
import { ChevronDownIcon, PlusIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { EmployeeRecord, PaginatedResponse, TicketRecord } from '../types'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  it: 'IT',
  hr: 'HR',
  facilities: 'Facilities',
  payroll: 'Payroll',
  other: 'Other',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function ticketsUrl(status: string) {
  return status ? `/api/tickets/?status=${status}` : '/api/tickets/'
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

function StatusBadge({ ticket }: { ticket: TicketRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
          STATUS_STYLES[ticket.status] ?? 'bg-slate-100 text-slate-700'
        }`}
      >
        {ticket.status.replace('_', ' ')}
      </span>
      {ticket.is_overdue && (
        <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          Overdue
        </span>
      )}
    </div>
  )
}

interface TicketDetailProps {
  ticket: TicketRecord
  isStaff: boolean
  myEmployeeId: number | null
  employees: EmployeeRecord[]
  onChanged: () => void
}

function TicketDetail({ ticket, isStaff, myEmployeeId, employees, onChanged }: TicketDetailProps) {
  const [comment, setComment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRequester = myEmployeeId !== null && ticket.requester === myEmployeeId
  const canClose = (isStaff || isRequester) && ticket.status === 'resolved'
  const canReopen = (isStaff || isRequester) && ['resolved', 'closed'].includes(ticket.status)
  const canResolve = isStaff && ['open', 'in_progress'].includes(ticket.status)
  const canAssign = isStaff && !['resolved', 'closed'].includes(ticket.status)

  async function runAction(action: () => Promise<void>) {
    setError(null)
    setIsBusy(true)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleComment() {
    if (!comment.trim()) return
    await runAction(async () => {
      await apiClient.post('/api/ticket-comments/', { ticket: ticket.id, body: comment })
      setComment('')
    })
  }

  return (
    <div className="space-y-4 p-6">
      {ticket.description && <p className="text-sm text-[#5a6a85]">{ticket.description}</p>}

      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <div className="flex items-center gap-2">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded-full border border-[#e7ded0] bg-white px-3 py-1.5 text-xs text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            >
              <option value="">Assign to...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
            <button
              disabled={!assigneeId || isBusy}
              onClick={() =>
                runAction(async () => {
                  await apiClient.post(`/api/tickets/${ticket.id}/assign/`, {
                    assigned_to: Number(assigneeId),
                  })
                })
              }
              className="rounded-full bg-[#1c2f4d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        )}
        {canResolve && (
          <button
            disabled={isBusy}
            onClick={() => runAction(() => apiClient.post(`/api/tickets/${ticket.id}/resolve/`))}
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            Mark Resolved
          </button>
        )}
        {canClose && (
          <button
            disabled={isBusy}
            onClick={() => runAction(() => apiClient.post(`/api/tickets/${ticket.id}/close/`))}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#5a6a85] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2] disabled:opacity-50"
          >
            Close Ticket
          </button>
        )}
        {canReopen && (
          <button
            disabled={isBusy}
            onClick={() => runAction(() => apiClient.post(`/api/tickets/${ticket.id}/reopen/`))}
            className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Reopen
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
          Comments ({ticket.comments.length})
        </h3>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {ticket.comments.length > 0 ? (
            ticket.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-[#faf6ec] px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#1c2f4d]">{c.author_name}</span>
                  <span className="text-xs text-[#93a2bc]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[#5a6a85]">{c.body}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#5a6a85]">No comments yet.</p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          />
          <button
            disabled={isBusy || !comment.trim()}
            onClick={handleComment}
            className="rounded-xl bg-[#1c2f4d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function Tickets() {
  const { user } = useAuth()
  const myEmployeeId = user?.employee?.id ?? null
  const isStaff = user?.is_staff ?? false

  const [statusFilter, setStatusFilter] = useState('')
  const [url, setUrl] = useState(() => ticketsUrl(''))
  const [data, setData] = useState<PaginatedResponse<TicketRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])

  const loadTickets = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<TicketRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load tickets.'))
      .finally(() => setIsLoading(false))
  }, [url])

  useEffect(() => {
    setUrl(ticketsUrl(statusFilter))
  }, [statusFilter])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (!isStaff) return
    apiClient
      .get<PaginatedResponse<EmployeeRecord>>('/api/employees/?status=active&page_size=200')
      .then((response) => setEmployees(response.data.results))
      .catch(() => setEmployees([]))
  }, [isStaff])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1c2f4d]">Tickets</h1>

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

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-4 py-2 text-sm font-bold text-[#f4efe2] shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            New Ticket
          </button>
        </div>
      </div>

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
                <thead className="bg-[#faf6ec] text-xs font-semibold text-[#5a6a85] uppercase">
                  <tr>
                    <th className="px-6 py-3">Ticket</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Requester</th>
                    <th className="px-6 py-3">Assigned To</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece0]">
                  {data.results.map((ticket) => (
                    <Fragment key={ticket.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-[#1c2f4d]">
                          <p className="font-medium">{ticket.ticket_number}</p>
                          <p className="text-xs text-[#5a6a85]">{ticket.subject}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              PRIORITY_STYLES[ticket.priority] ?? 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {ticket.requester_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                          {ticket.assigned_to_name ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge ticket={ticket} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === ticket.id ? null : ticket.id)
                            }
                            className="rounded-full px-3 py-1 text-xs font-semibold text-[#1c2f4d] ring-1 ring-[#e7ded0] hover:bg-[#f4efe2]"
                          >
                            {expandedId === ticket.id ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === ticket.id && (
                        <tr>
                          <td colSpan={7} className="bg-[#faf6ec]">
                            <TicketDetail
                              ticket={ticket}
                              isStaff={isStaff}
                              myEmployeeId={myEmployeeId}
                              employees={employees}
                              onChanged={loadTickets}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#f0ece0] px-6 py-4 text-sm text-[#5a6a85]">
              <span>
                {data.count} ticket{data.count === 1 ? '' : 's'}
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
          <p className="p-8 text-center text-sm text-[#5a6a85]">No tickets found.</p>
        )}
      </div>

      <TicketFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadTickets}
      />
    </div>
  )
}

export default Tickets
