import { useCallback, useEffect, useState } from 'react'
import JobPostingFormModal from '../components/JobPostingFormModal'
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type {
  BranchOption,
  DepartmentOption,
  JobPostingRecord,
  PaginatedResponse,
} from '../types'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
  filled: 'bg-[#eef2ff] text-[#4f46e5]',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

function postingsUrl(status: string) {
  return status ? `/api/job-postings/?status=${status}` : '/api/job-postings/'
}

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

function formatSalaryRange(min: string, max: string) {
  return `${currencyFormatter.format(Number(min))} – ${currencyFormatter.format(Number(max))}`
}

function Recruitment() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)

  const [statusFilter, setStatusFilter] = useState('')
  const [url, setUrl] = useState(() => postingsUrl(''))
  const [data, setData] = useState<PaginatedResponse<JobPostingRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPosting, setEditingPosting] = useState<JobPostingRecord | null>(null)

  const loadPostings = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<JobPostingRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load job postings.'))
      .finally(() => setIsLoading(false))
  }, [url])

  useEffect(() => {
    setUrl(postingsUrl(statusFilter))
  }, [statusFilter])

  useEffect(() => {
    loadPostings()
  }, [loadPostings])

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<DepartmentOption>>('/api/departments/?page_size=100')
      .then((response) => setDepartments(response.data.results))
      .catch(() => setDepartments([]))
    apiClient
      .get<PaginatedResponse<BranchOption>>('/api/branches/?page_size=100')
      .then((response) => setBranches(response.data.results))
      .catch(() => setBranches([]))
  }, [])

  function handleAdd() {
    setEditingPosting(null)
    setIsModalOpen(true)
  }

  function handleEdit(posting: JobPostingRecord) {
    setEditingPosting(posting)
    setIsModalOpen(true)
  }

  async function handleDelete(posting: JobPostingRecord) {
    const confirmed = window.confirm(`Delete the "${posting.title}" job posting?`)
    if (!confirmed) return

    try {
      await apiClient.delete(`/api/job-postings/${posting.id}/`)
      loadPostings()
    } catch {
      window.alert('Failed to delete job posting.')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Recruitment</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Job Postings</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-full bg-white py-2 pr-11 pl-4 text-sm text-[#111827] shadow-sm ring-1 ring-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#4f46e5]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
          </div>

          {isStaff && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Post a Job
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl bg-white p-16 shadow-sm ring-1 ring-black/5">
            <Spinner className="h-8 w-8 text-[#111827]" />
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-red-500 shadow-sm ring-1 ring-black/5">
            {error}
          </p>
        ) : data && data.results.length > 0 ? (
          <div className="space-y-4">
            {data.results.map((posting) => {
              const isExpanded = expandedId === posting.id
              return (
                <div
                  key={posting.id}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : posting.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-[#111827]">{posting.title}</h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            STATUS_STYLES[posting.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {posting.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {posting.department_name} &middot; {posting.branch_name} &middot;{' '}
                        {posting.work_setup_display} &middot; {posting.employment_type_display}
                        {posting.closing_date && <> &middot; Closes {posting.closing_date}</>}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#111827]">
                        {formatSalaryRange(posting.min_salary, posting.max_salary)} &middot;{' '}
                        {posting.available_slots} slot{posting.available_slots === 1 ? '' : 's'}
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {isStaff && (
                        <>
                          <button
                            onClick={() => handleEdit(posting)}
                            title="Edit"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(posting)}
                            title="Delete"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-rose-50 hover:text-rose-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <ChevronDownIcon
                        className={`h-4 w-4 text-[#9ca3af] transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-[#e5e7eb] pt-4 text-sm">
                      <div
                        className="text-[#111827] [&_blockquote]:border-l-2 [&_blockquote]:border-[#e5e7eb] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#6b7280] [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: posting.description }}
                      />
                      {posting.posted_by_name && (
                        <p className="text-xs text-[#9ca3af]">
                          Posted by {posting.posted_by_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#6b7280] shadow-sm ring-1 ring-black/5">
            No job postings found.
          </p>
        )}
      </div>

      {isStaff && (
        <JobPostingFormModal
          isOpen={isModalOpen}
          posting={editingPosting}
          departments={departments}
          branches={branches}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadPostings}
        />
      )}
    </div>
  )
}

export default Recruitment
