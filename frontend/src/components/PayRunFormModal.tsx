import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  start_date: string
  end_date: string
  pay_date: string
}

const EMPTY_VALUES: FormValues = { start_date: '', end_date: '', pay_date: '' }

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

function inputClass() {
  return 'w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]'
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold text-[#5a6a85] uppercase'
}

interface PayRunFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

function PayRunFormModal({ isOpen, onClose, onSaved }: PayRunFormModalProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValues(EMPTY_VALUES)
      setError(null)
    }
  }, [isOpen])

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/pay-runs/', values)
      onSaved()
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Pay Run">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass()}>Start Date</label>
          <input
            type="date"
            required
            value={values.start_date}
            onChange={(e) => setField('start_date', e.target.value)}
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()}>End Date</label>
          <input
            type="date"
            required
            value={values.end_date}
            onChange={(e) => setField('end_date', e.target.value)}
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()}>Pay Date</label>
          <input
            type="date"
            required
            value={values.pay_date}
            onChange={(e) => setField('pay_date', e.target.value)}
            className={inputClass()}
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
            Create Pay Run
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default PayRunFormModal
