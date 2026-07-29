import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { BranchOption, DepartmentOption, JobPostingRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

interface FormValues {
  title: string
  department: string
  branch: string
  employment_type: string
  description: string
  requirements: string
  status: string
  closing_date: string
}

const EMPTY_VALUES: FormValues = {
  title: '',
  department: '',
  branch: '',
  employment_type: 'full_time',
  description: '',
  requirements: '',
  status: 'open',
  closing_date: '',
}

function valuesFromPosting(posting: JobPostingRecord): FormValues {
  return {
    title: posting.title,
    department: String(posting.department),
    branch: String(posting.branch),
    employment_type: posting.employment_type,
    description: posting.description,
    requirements: posting.requirements,
    status: posting.status,
    closing_date: posting.closing_date ?? '',
  }
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

interface JobPostingFormModalProps {
  isOpen: boolean
  posting: JobPostingRecord | null
  departments: DepartmentOption[]
  branches: BranchOption[]
  onClose: () => void
  onSaved: () => void
}

function JobPostingFormModal({
  isOpen,
  posting,
  departments,
  branches,
  onClose,
  onSaved,
}: JobPostingFormModalProps) {
  const isEdit = posting !== null
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setValues(posting ? valuesFromPosting(posting) : EMPTY_VALUES)
  }, [isOpen, posting])

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const payload: Record<string, unknown> = {
      title: values.title,
      department: Number(values.department),
      branch: Number(values.branch),
      employment_type: values.employment_type,
      description: values.description,
      requirements: values.requirements,
      status: values.status,
      closing_date: values.closing_date || null,
    }

    try {
      if (isEdit) {
        await apiClient.patch(`/api/job-postings/${posting.id}/`, payload)
      } else {
        await apiClient.post('/api/job-postings/', payload)
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Job Posting' : 'New Job Posting'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass()}>Job Title</label>
          <input
            required
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            className={inputClass()}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Department</label>
            <select
              required
              value={values.department}
              onChange={(e) => setField('department', e.target.value)}
              className={inputClass()}
            >
              <option value="" disabled>
                Select...
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass()}>Branch</label>
            <select
              required
              value={values.branch}
              onChange={(e) => setField('branch', e.target.value)}
              className={inputClass()}
            >
              <option value="" disabled>
                Select...
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Employment Type</label>
            <select
              value={values.employment_type}
              onChange={(e) => setField('employment_type', e.target.value)}
              className={inputClass()}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass()}>Closing Date (optional)</label>
            <input
              type="date"
              value={values.closing_date}
              onChange={(e) => setField('closing_date', e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>

        {isEdit && (
          <div>
            <label className={labelClass()}>Status</label>
            <select
              value={values.status}
              onChange={(e) => setField('status', e.target.value)}
              className={inputClass()}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass()}>Description</label>
          <textarea
            required
            rows={4}
            value={values.description}
            onChange={(e) => setField('description', e.target.value)}
            className={inputClass()}
          />
        </div>

        <div>
          <label className={labelClass()}>Requirements (optional)</label>
          <textarea
            rows={3}
            value={values.requirements}
            onChange={(e) => setField('requirements', e.target.value)}
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
            {isEdit ? 'Save changes' : 'Post job'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default JobPostingFormModal
