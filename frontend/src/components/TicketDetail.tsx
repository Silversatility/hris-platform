import axios from 'axios'
import { useState } from 'react'
import { apiClient } from '../lib/apiClient'
import type { EmployeeRecord, TicketRecord } from '../types'

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
    <div className="space-y-4">
      {ticket.description && <p className="text-sm text-[#6b7280]">{ticket.description}</p>}

      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <div className="flex items-center gap-2">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5]"
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
              className="rounded-full bg-[#4f46e5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#6b7280] ring-1 ring-[#e5e7eb] hover:bg-[#f8fafc] disabled:opacity-50"
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
        <h3 className="mb-2 text-xs font-bold tracking-wide text-[#111827] uppercase">
          Comments ({ticket.comments.length})
        </h3>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {ticket.comments.length > 0 ? (
            ticket.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-[#f9fafb] px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#111827]">{c.author_name}</span>
                  <span className="text-xs text-[#9ca3af]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[#6b7280]">{c.body}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6b7280]">No comments yet.</p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
          <button
            disabled={isBusy || !comment.trim()}
            onClick={handleComment}
            className="rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default TicketDetail
