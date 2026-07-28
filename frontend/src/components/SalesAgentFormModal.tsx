import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { SalesAgentRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  agent_id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  default_commission_rate: string
  status: string
  date_joined: string
  bank_name: string
  bank_bic: string
  bank_account_number: string
  bank_account_holder_name: string
}

const EMPTY_VALUES: FormValues = {
  agent_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  default_commission_rate: '',
  status: 'active',
  date_joined: '',
  bank_name: '',
  bank_bic: '',
  bank_account_number: '',
  bank_account_holder_name: '',
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
  return 'w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]'
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold text-[#5a6a85] uppercase'
}

interface SalesAgentFormModalProps {
  isOpen: boolean
  agent: SalesAgentRecord | null
  onClose: () => void
  onSaved: () => void
}

function SalesAgentFormModal({ isOpen, agent, onClose, onSaved }: SalesAgentFormModalProps) {
  const isEdit = agent !== null
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setValues(
      agent
        ? {
            agent_id: agent.agent_id,
            first_name: agent.first_name,
            last_name: agent.last_name,
            email: agent.email,
            phone_number: agent.phone_number,
            default_commission_rate: agent.default_commission_rate,
            status: agent.status,
            date_joined: agent.date_joined,
            bank_name: agent.bank_name,
            bank_bic: agent.bank_bic,
            bank_account_number: agent.bank_account_number,
            bank_account_holder_name: agent.bank_account_holder_name,
          }
        : EMPTY_VALUES
    )
  }, [isOpen, agent])

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEdit) {
        await apiClient.patch(`/api/sales-agents/${agent.id}/`, values)
      } else {
        await apiClient.post('/api/sales-agents/', values)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Sales Agent' : 'Add Sales Agent'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <div className="col-span-2">
              <label className={labelClass()}>Agent ID (auto if blank)</label>
              <input
                value={values.agent_id}
                onChange={(e) => setField('agent_id', e.target.value)}
                className={inputClass()}
              />
            </div>
          )}
          <div>
            <label className={labelClass()}>First Name</label>
            <input
              required
              value={values.first_name}
              onChange={(e) => setField('first_name', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Last Name</label>
            <input
              required
              value={values.last_name}
              onChange={(e) => setField('last_name', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass()}>Email</label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass()}>Phone Number</label>
            <input
              value={values.phone_number}
              onChange={(e) => setField('phone_number', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Default Commission Rate (%)</label>
            <input
              type="number"
              step="0.01"
              required
              value={values.default_commission_rate}
              onChange={(e) => setField('default_commission_rate', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Date Joined</label>
            <input
              type="date"
              required
              value={values.date_joined}
              onChange={(e) => setField('date_joined', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass()}>Status</label>
            <select
              value={values.status}
              onChange={(e) => setField('status', e.target.value)}
              className={inputClass()}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="border-t border-[#f0ece0] pt-4">
          <p className="mb-3 text-xs font-semibold uppercase text-[#5a6a85]">
            Payout details (PayMongo bank transfer)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass()}>Bank Name</label>
              <input
                value={values.bank_name}
                onChange={(e) => setField('bank_name', e.target.value)}
                placeholder="e.g. BDO Unibank"
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Bank BIC</label>
              <input
                value={values.bank_bic}
                onChange={(e) => setField('bank_bic', e.target.value)}
                placeholder="e.g. BNORPHMM"
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Account Number</label>
              <input
                value={values.bank_account_number}
                onChange={(e) => setField('bank_account_number', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Account Holder Name</label>
              <input
                value={values.bank_account_holder_name}
                onChange={(e) => setField('bank_account_holder_name', e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
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
            {isEdit ? 'Save changes' : 'Add agent'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SalesAgentFormModal
