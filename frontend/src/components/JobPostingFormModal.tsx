import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { BranchOption, DepartmentOption, JobPostingRecord } from '../types'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'
import Spinner from './Spinner'

const WORK_SETUPS = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Work From Home' },
  { value: 'hybrid', label: 'Hybrid' },
]

const EMPLOYMENT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'project_based', label: 'Project-based' },
  { value: 'seasonal', label: 'Seasonal' },
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
  work_setup: string
  employment_type: string
  available_slots: string
  min_salary: string
  max_salary: string
  description: string
  status: string
  closing_date: string
}

const EMPTY_VALUES: FormValues = {
  title: '',
  department: '',
  branch: '',
  work_setup: 'onsite',
  employment_type: 'regular',
  available_slots: '1',
  min_salary: '',
  max_salary: '',
  description: '',
  status: 'open',
  closing_date: '',
}

function valuesFromPosting(posting: JobPostingRecord): FormValues {
  return {
    title: posting.title,
    department: String(posting.department),
    branch: String(posting.branch),
    work_setup: posting.work_setup,
    employment_type: posting.employment_type,
    available_slots: String(posting.available_slots),
    min_salary: posting.min_salary,
    max_salary: posting.max_salary,
    description: posting.description,
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
      work_setup: values.work_setup,
      employment_type: values.employment_type,
      available_slots: Number(values.available_slots),
      min_salary: values.min_salary,
      max_salary: values.max_salary,
      description: values.description,
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass()}>Work Setup</label>
            <select
              value={values.work_setup}
              onChange={(e) => setField('work_setup', e.target.value)}
              className={inputClass()}
            >
              {WORK_SETUPS.map((setup) => (
                <option key={setup.value} value={setup.value}>
                  {setup.label}
                </option>
              ))}
            </select>
          </div>
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
            <label className={labelClass()}>Available Slots</label>
            <input
              type="number"
              min={1}
              required
              value={values.available_slots}
              onChange={(e) => setField('available_slots', e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Minimum Salary</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={values.min_salary}
              onChange={(e) => setField('min_salary', e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()}>Maximum Salary</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={values.max_salary}
              onChange={(e) => setField('max_salary', e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass()}>Closing Date (optional)</label>
            <input
              type="date"
              value={values.closing_date}
              onChange={(e) => setField('closing_date', e.target.value)}
              className={inputClass()}
            />
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
        </div>

        <div>
          <label className={labelClass()}>Job Description</label>
          <RichTextEditor
            value={values.description}
            onChange={(html) => setField('description', html)}
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
