import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { SalesAgentRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  agent: string
  sale_date: string
  customer_name: string
  vehicle_description: string
  sale_amount: string
  commission_rate: string
  notes: string
}

const EMPTY_VALUES: FormValues = {
  agent: '',
  sale_date: '',
  customer_name: '',
  vehicle_description: '',
  sale_amount: '',
  commission_rate: '',
  notes: '',
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

function inputClass() {
  return 'w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5]'
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold text-[#6b7280] uppercase'
}

interface SaleFormModalProps {
  isOpen: boolean
  agents: SalesAgentRecord[]
  onClose: () => void
  onSaved: () => void
}

function SaleFormModal({ isOpen, agents, onClose, onSaved }: SaleFormModalProps) {
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
      const payload: Record<string, unknown> = {
        agent: Number(values.agent),
        sale_date: values.sale_date,
        customer_name: values.customer_name,
        vehicle_description: values.vehicle_description,
        sale_amount: values.sale_amount,
        notes: values.notes,
      }
      if (values.commission_rate) payload.commission_rate = values.commission_rate
      await apiClient.post('/api/sales/', payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log a Sale">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass()}>Agent</label>
          <select
            required
            value={values.agent}
            onChange={(e) => setField('agent', e.target.value)}
            className={inputClass()}
          >
            <option value="" disabled>
              Select...
            </option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name} ({agent.default_commission_rate}%)
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Sale Date</label>
            <input
              type="date"
              required
              value={values.sale_date}
              onChange={(e) => setField('sale_date', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Commission Rate % (optional)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Uses agent default"
              value={values.commission_rate}
              onChange={(e) => setField('commission_rate', e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
        <div>
          <label className={labelClass()}>Vehicle</label>
          <input
            required
            value={values.vehicle_description}
            onChange={(e) => setField('vehicle_description', e.target.value)}
            className={inputClass()}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Customer Name</label>
            <input
              value={values.customer_name}
              onChange={(e) => setField('customer_name', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Sale Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={values.sale_amount}
              onChange={(e) => setField('sale_amount', e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
        <div>
          <label className={labelClass()}>Notes</label>
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) => setField('notes', e.target.value)}
            className={inputClass()}
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
            Log Sale
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SaleFormModal
