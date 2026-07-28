import axios from 'axios'
import { useState } from 'react'
import Modal from './Modal'
import TicketDetail from './TicketDetail'
import { apiClient } from '../lib/apiClient'
import {
  ALLOWED_TRANSITIONS,
  BOARD_COLUMNS,
  CATEGORY_LABELS,
  PRIORITY_STYLES,
} from '../lib/ticketDisplay'
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

interface TicketBoardProps {
  tickets: TicketRecord[]
  isStaff: boolean
  myEmployeeId: number | null
  employees: EmployeeRecord[]
  onChanged: () => void
}

function TicketCard({
  ticket,
  onDragStart,
  onClick,
}: {
  ticket: TicketRecord
  onDragStart: () => void
  onClick: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-grab space-y-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#5a6a85]">{ticket.ticket_number}</span>
        {ticket.is_overdue && (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
            OVERDUE
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-[#1c2f4d]">{ticket.subject}</p>
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
            PRIORITY_STYLES[ticket.priority] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {ticket.priority}
        </span>
        <span className="text-[10px] text-[#93a2bc]">
          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
        </span>
      </div>
      <p className="text-xs text-[#5a6a85]">{ticket.assigned_to_name ?? 'Unassigned'}</p>
    </div>
  )
}

function TicketBoard({ tickets, isStaff, myEmployeeId, employees, onChanged }: TicketBoardProps) {
  const [draggingTicket, setDraggingTicket] = useState<TicketRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null)

  async function handleDrop(targetStatus: string) {
    const ticket = draggingTicket
    setDraggingTicket(null)
    if (!ticket || ticket.status === targetStatus) return

    if (!ALLOWED_TRANSITIONS[ticket.status]?.includes(targetStatus)) {
      setError(
        `Can't move a ${ticket.status.replace('_', ' ')} ticket directly to ` +
          `${targetStatus.replace('_', ' ')}.`
      )
      return
    }

    if (targetStatus === 'in_progress' && !ticket.assigned_to) {
      setError('Assign someone before moving this ticket to In Progress.')
      setSelectedTicket(ticket)
      return
    }

    setError(null)
    try {
      if (targetStatus === 'in_progress') {
        await apiClient.post(`/api/tickets/${ticket.id}/assign/`, {
          assigned_to: ticket.assigned_to,
        })
      } else if (targetStatus === 'resolved') {
        await apiClient.post(`/api/tickets/${ticket.id}/resolve/`)
      } else if (targetStatus === 'closed') {
        await apiClient.post(`/api/tickets/${ticket.id}/close/`)
      } else if (targetStatus === 'open') {
        await apiClient.post(`/api/tickets/${ticket.id}/reopen/`)
      }
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const columnTickets = tickets.filter((t) => t.status === column.status)
          return (
            <div
              key={column.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(column.status)
              }}
              className="flex min-h-[16rem] flex-col rounded-2xl bg-[#f4efe2] p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold tracking-wide text-[#1c2f4d] uppercase">
                  {column.label}
                </h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#5a6a85]">
                  {columnTickets.length}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {columnTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDragStart={() => setDraggingTicket(ticket)}
                    onClick={() => setSelectedTicket(ticket)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `${selectedTicket.ticket_number} — ${selectedTicket.subject}` : ''}
      >
        {selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            isStaff={isStaff}
            myEmployeeId={myEmployeeId}
            employees={employees}
            onChanged={() => {
              onChanged()
              setSelectedTicket(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default TicketBoard
