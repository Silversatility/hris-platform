import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { LeaveTypeRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}

const EMPTY_VALUES: FormValues = { leave_type: '', start_date: '', end_date: '', reason: '' }

interface LeaveRequestFormModalProps {
  isOpen: boolean
  leaveTypes: LeaveTypeRecord[]
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

function LeaveRequestFormModal({
  isOpen,
  leaveTypes,
  onClose,
  onSaved,
}: LeaveRequestFormModalProps) {
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
      await apiClient.post('/api/leave-requests/', {
        leave_type: Number(values.leave_type),
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Leave Type
          </label>
          <select
            required
            value={values.leave_type}
            onChange={(e) => setValues((prev) => ({ ...prev, leave_type: e.target.value }))}
            className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          >
            <option value="" disabled>
              Select...
            </option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
              Start Date
            </label>
            <input
              type="date"
              required
              value={values.start_date}
              onChange={(e) => setValues((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
              End Date
            </label>
            <input
              type="date"
              required
              value={values.end_date}
              onChange={(e) => setValues((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Reason
          </label>
          <textarea
            rows={3}
            value={values.reason}
            onChange={(e) => setValues((prev) => ({ ...prev, reason: e.target.value }))}
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
            Submit Request
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default LeaveRequestFormModal
