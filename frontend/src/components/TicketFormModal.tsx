import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  category: string
  subject: string
  description: string
  priority: string
}

const EMPTY_VALUES: FormValues = {
  category: 'other',
  subject: '',
  description: '',
  priority: 'medium',
}

interface TicketFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
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

function TicketFormModal({ isOpen, onClose, onSaved }: TicketFormModalProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValues(EMPTY_VALUES)
      setError(null)
    }
  }, [isOpen])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/tickets/', values)
      onSaved()
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Ticket">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
              Category
            </label>
            <select
              value={values.category}
              onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            >
              <option value="it">IT</option>
              <option value="hr">HR</option>
              <option value="facilities">Facilities</option>
              <option value="payroll">Payroll</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
              Priority
            </label>
            <select
              value={values.priority}
              onChange={(e) => setValues((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Subject
          </label>
          <input
            required
            value={values.subject}
            onChange={(e) => setValues((prev) => ({ ...prev, subject: e.target.value }))}
            className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Description
          </label>
          <textarea
            rows={4}
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-[#f0ece0] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#5a6a85] hover:bg-[#f4efe2]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-5 py-2 text-sm font-bold text-[#f4efe2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Submit Ticket
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TicketFormModal
