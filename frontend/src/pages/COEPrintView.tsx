import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { apiClient } from '../lib/apiClient'
import type { COERequestRecord } from '../types'

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  active: 'currently employed',
  on_leave: 'currently employed',
  terminated: 'no longer employed',
}

function COEPrintView() {
  const { id } = useParams()
  const { logoUrl } = useSiteSettings()
  const [coeRequest, setCoeRequest] = useState<COERequestRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<COERequestRecord>(`/api/coe-requests/${id}/`)
      .then((response) => setCoeRequest(response.data))
      .catch(() => setError('Could not load this certificate request.'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Spinner className="h-8 w-8 text-[#111827]" />
      </div>
    )
  }

  if (error || !coeRequest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <p className="text-sm text-red-500">{error ?? 'Request not found.'}</p>
        <Link to="/" className="text-sm font-semibold text-[#4f46e5] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (coeRequest.status !== 'approved') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f8fafc] px-4 text-center">
        <p className="text-sm text-[#6b7280]">
          This certificate isn't available to print yet — it can be printed once HR has approved
          the request.
        </p>
        <Link to="/" className="text-sm font-semibold text-[#4f46e5] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const employmentPhrase = EMPLOYMENT_STATUS_LABELS[coeRequest.employee_status] ?? 'employed'
  const asOfDate = coeRequest.reviewed_at
    ? new Date(coeRequest.reviewed_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link to="/coe-requests" className="text-sm font-semibold text-[#4f46e5] hover:underline">
            &larr; Back to Certificate Requests
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-5 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-black/5 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] pb-6">
            {logoUrl && (
              <img src={logoUrl} alt="Company logo" className="h-12 w-12 object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-[#111827]">HRIS Platform</h1>
              <p className="text-sm text-[#6b7280]">Certificate of Employment</p>
            </div>
          </div>

          <p className="mt-8 text-sm font-semibold text-[#111827] uppercase">
            To Whom It May Concern:
          </p>

          <p className="mt-6 text-sm leading-7 text-[#111827]">
            This is to certify that <strong>{coeRequest.employee_display_name}</strong> (Employee
            ID: {coeRequest.employee_code}) is {employmentPhrase} with our company as{' '}
            <strong>{coeRequest.employee_job_title}</strong> under the{' '}
            <strong>{coeRequest.employee_department}</strong> department at our{' '}
            <strong>{coeRequest.employee_branch}</strong> branch, since{' '}
            <strong>{coeRequest.employee_hire_date}</strong>.
          </p>

          <p className="mt-4 text-sm leading-7 text-[#111827]">
            This certification is issued upon the request of the employee
            {coeRequest.purpose ? ` for ${coeRequest.purpose}` : ''}.
          </p>

          <p className="mt-8 text-sm text-[#111827]">Issued this {asOfDate}.</p>

          <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="border-t border-[#111827] pt-2">
                <p className="font-semibold text-[#111827]">
                  {coeRequest.reviewed_by_name ?? 'HR Representative'}
                </p>
                <p className="text-xs text-[#6b7280]">Human Resources</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between text-xs text-[#9ca3af]">
            <span>Generated {new Date(coeRequest.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default COEPrintView
