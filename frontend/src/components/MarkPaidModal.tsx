import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import Modal from './Modal'
import Spinner from './Spinner'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

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

interface MarkPaidModalProps {
  isOpen: boolean
  title: string
  endpoint: string | null
  onClose: () => void
  onSaved: () => void
}

function MarkPaidModal({ isOpen, title, endpoint, onClose, onSaved }: MarkPaidModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentReference, setPaymentReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('bank_transfer')
      setPaymentReference('')
      setError(null)
    }
  }, [isOpen])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!endpoint) return
    setError(null)
    setIsSubmitting(true)
    try {
      await apiClient.post(endpoint, {
        payment_method: paymentMethod,
        payment_reference: paymentReference,
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
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[#6b7280]">
          This only records that payment was made outside the system (bank transfer, GCash,
          etc.) — it does not send any money.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#6b7280] uppercase">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5]"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#6b7280] uppercase">
            Reference (optional)
          </label>
          <input
            placeholder="e.g. transaction ID, receipt number"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-[#e5e7eb] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-5 py-2 text-sm font-bold text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Mark as Paid
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default MarkPaidModal
