import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { DepartmentRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

interface FormValues {
  name: string
  code: string
  is_active: boolean
}

const EMPTY_VALUES: FormValues = { name: '', code: '', is_active: true }

interface DepartmentFormModalProps {
  isOpen: boolean
  department: DepartmentRecord | null
  onClose: () => void
  onSaved: () => void
}

function DepartmentFormModal({ isOpen, department, onClose, onSaved }: DepartmentFormModalProps) {
  const isEdit = department !== null
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setValues(
      department
        ? { name: department.name, code: department.code, is_active: department.is_active }
        : EMPTY_VALUES
    )
  }, [isOpen, department])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isEdit) {
        await apiClient.patch(`/api/departments/${department.id}/`, values)
      } else {
        await apiClient.post('/api/departments/', values)
      }
      onSaved()
      onClose()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, string[] | string>
        setError(
          Object.entries(data)
            .map(([field, messages]) =>
              Array.isArray(messages) ? `${field}: ${messages.join(' ')}` : `${field}: ${messages}`
            )
            .join(' — ')
        )
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Department' : 'Add Department'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Name
          </label>
          <input
            required
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#5a6a85] uppercase">
            Code
          </label>
          <input
            required
            value={values.code}
            onChange={(e) => setValues((prev) => ({ ...prev, code: e.target.value }))}
            className="w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#1c2f4d]">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((prev) => ({ ...prev, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-[#e7ded0] text-[#1c2f4d] focus:ring-[#1c2f4d]"
          />
          Active
        </label>

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
            {isEdit ? 'Save changes' : 'Create department'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default DepartmentFormModal
