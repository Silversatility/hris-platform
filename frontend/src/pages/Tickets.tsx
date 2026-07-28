import { Fragment, useCallback, useEffect, useState } from 'react'
import TicketBoard from '../components/TicketBoard'
import TicketDetail from '../components/TicketDetail'
import TicketFormModal from '../components/TicketFormModal'
import { ChevronDownIcon, PlusIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import { CATEGORY_LABELS, PRIORITY_STYLES, STATUS_OPTIONS, STATUS_STYLES } from '../lib/ticketDisplay'
import type { EmployeeRecord, PaginatedResponse, TicketRecord } from '../types'

function ticketsUrl(status: string) {
  return status ? `/api/tickets/?status=${status}` : '/api/tickets/'
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

function Tickets() {
  const { user } = useAuth()
  const myEmployeeId = user?.employee?.id ?? null
  const isStaff = user?.is_staff ?? false

  const [view, setView] = useState<'list' | 'board'>('list')
  const [statusFilter, setStatusFilter] = useState('')
  const [url, setUrl] = useState(() => ticketsUrl(''))
  const [data, setData] = useState<PaginatedResponse<TicketRecord> | null>(null)
  const [boardTickets, setBoardTickets] = useState<TicketRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])

  const loadTickets = useCallback(() => {
    setIsLoading(true)
    setError(null)
    if (view === 'board') {
      apiClient
        .get<PaginatedResponse<TicketRecord>>('/api/tickets/?page_size=200')
        .then((response) => setBoardTickets(response.data.results))
        .catch(() => setError('Failed to load tickets.'))
        .finally(() => setIsLoading(false))
    } else {
      apiClient
        .get<PaginatedResponse<TicketRecord>>(url)
        .then((response) => setData(response.data))
        .catch(() => setError('Failed to load tickets.'))
        .finally(() => setIsLoading(false))
    }
  }, [url, view])

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
        <h1 className="text-2xl font-bold text-[#111827]">Tickets</h1>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-[#e5e7eb]">
            <button
              onClick={() => setView('list')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'list' ? 'bg-[#4f46e5] text-white' : 'text-[#6b7280] hover:bg-[#f8fafc]'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('board')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'board' ? 'bg-[#4f46e5] text-white' : 'text-[#6b7280] hover:bg-[#f8fafc]'
              }`}
            >
              Board
            </button>
          </div>

          {view === 'list' && (
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
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            New Ticket
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl bg-white p-16 shadow-sm ring-1 ring-black/5">
          <Spinner className="h-8 w-8 text-[#111827]" />
        </div>
      ) : error ? (
        <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-red-500 shadow-sm ring-1 ring-black/5">
          {error}
        </p>
      ) : view === 'board' ? (
        <div className="mt-6">
          <TicketBoard
            tickets={boardTickets}
            isStaff={isStaff}
            myEmployeeId={myEmployeeId}
            employees={employees}
            onChanged={loadTickets}
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {data && data.results.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#e5e7eb] text-xs font-semibold text-[#9ca3af] uppercase">
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
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {data.results.map((ticket) => (
                      <Fragment key={ticket.id}>
                        <tr
                          onClick={() =>
                            setExpandedId(expandedId === ticket.id ? null : ticket.id)
                          }
                          className="cursor-pointer transition-colors hover:bg-[#f9fafb]"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-[#111827]">
                            <p className="font-medium">{ticket.ticket_number}</p>
                            <p className="text-xs text-[#6b7280]">{ticket.subject}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
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
                          <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                            {ticket.requester_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                            {ticket.assigned_to_name ?? '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge ticket={ticket} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(expandedId === ticket.id ? null : ticket.id)
                              }}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#111827] ring-1 ring-[#e5e7eb] hover:bg-white"
                            >
                              {expandedId === ticket.id ? 'Hide' : 'View'}
                              <ChevronDownIcon
                                className={`h-3.5 w-3.5 transition-transform ${
                                  expandedId === ticket.id ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                        {expandedId === ticket.id && (
                          <tr>
                            <td colSpan={7} className="bg-[#f9fafb] p-6">
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
              <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-4 text-sm text-[#6b7280]">
                <span>
                  {data.count} ticket{data.count === 1 ? '' : 's'}
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
            <p className="p-8 text-center text-sm text-[#6b7280]">No tickets found.</p>
          )}
        </div>
      )}

      <TicketFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadTickets}
      />
    </div>
  )
}

export default Tickets
