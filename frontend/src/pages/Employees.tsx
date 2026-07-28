import { useCallback, useEffect, useState } from 'react'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { DepartmentOption, EmployeeRecord, PaginatedResponse } from '../types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-rose-100 text-rose-700',
}

function employeesUrl(departmentId: string) {
  return departmentId ? `/api/employees/?department=${departmentId}` : '/api/employees/'
}

async function fetchAllEmployees(): Promise<EmployeeRecord[]> {
  const results: EmployeeRecord[] = []
  let url: string | null = '/api/employees/'
  let guard = 0
  while (url && guard < 20) {
    const response: { data: PaginatedResponse<EmployeeRecord> } =
      await apiClient.get<PaginatedResponse<EmployeeRecord>>(url)
    results.push(...response.data.results)
    url = response.data.next
    guard += 1
  }
  return results
}

function Employees() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)

  const [departmentFilter, setDepartmentFilter] = useState('')
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [url, setUrl] = useState(() => employeesUrl(''))
  const [data, setData] = useState<PaginatedResponse<EmployeeRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [managerOptions, setManagerOptions] = useState<EmployeeRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)

  const loadEmployees = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<EmployeeRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setIsLoading(false))
  }, [url])

  const loadManagerOptions = useCallback(() => {
    if (!isStaff) return
    fetchAllEmployees()
      .then(setManagerOptions)
      .catch(() => setManagerOptions([]))
  }, [isStaff])

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<DepartmentOption>>('/api/departments/')
      .then((response) => setDepartments(response.data.results))
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    setUrl(employeesUrl(departmentFilter))
  }, [departmentFilter])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    loadManagerOptions()
  }, [loadManagerOptions])

  function handleAdd() {
    setEditingEmployee(null)
    setIsModalOpen(true)
  }

  function handleEdit(employee: EmployeeRecord) {
    setEditingEmployee(employee)
    setIsModalOpen(true)
  }

  function handleSaved() {
    loadEmployees()
    loadManagerOptions()
  }

  async function handleDelete(employee: EmployeeRecord) {
    const confirmed = window.confirm(
      `Delete ${employee.full_name || employee.user_email}? This also permanently removes ` +
        'their leave requests and balances. This cannot be undone.'
    )
    if (!confirmed) return

    try {
      await apiClient.delete(`/api/employees/${employee.id}/`)
      loadEmployees()
      loadManagerOptions()
    } catch {
      window.alert('Failed to delete employee.')
    }
  }

  const managerSelectOptions = managerOptions.map((manager) => ({
    id: manager.id,
    label: manager.full_name || manager.user_email,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1c2f4d]">Employees</h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="appearance-none rounded-full bg-white py-2 pr-11 pl-4 text-sm text-[#1c2f4d] shadow-sm ring-1 ring-[#e7ded0] outline-none focus:ring-2 focus:ring-[#1c2f4d]"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#5a6a85]" />
          </div>

          {isStaff && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-4 py-2 text-sm font-bold text-[#f4efe2] shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#1c2f4d]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-b from-[#1c2f4d] to-[#0d1b30] text-xs font-semibold text-[#dbe3ef] uppercase">
                  <tr>
                    <th className="px-6 py-3">Employee ID</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Job Title</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3">Status</th>
                    {isStaff && <th className="px-6 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece0]">
                  {data.results.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 font-medium whitespace-nowrap text-[#1c2f4d]">
                        {employee.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#1c2f4d]">
                        {employee.full_name || employee.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                        {employee.job_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                        {employee.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#5a6a85]">
                        {employee.manager_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            STATUS_STYLES[employee.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {employee.status.replace('_', ' ')}
                        </span>
                      </td>
                      {isStaff && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(employee)}
                              title="Edit"
                              className="rounded-full p-1.5 text-[#5a6a85] hover:bg-[#f4efe2] hover:text-[#1c2f4d]"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(employee)}
                              title="Delete"
                              className="rounded-full p-1.5 text-[#5a6a85] hover:bg-rose-50 hover:text-rose-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#f0ece0] px-6 py-4 text-sm text-[#5a6a85]">
              <span>
                {data.count} employee{data.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => data.previous && setUrl(data.previous)}
                  disabled={!data.previous}
                  className="rounded-full px-3 py-1.5 font-medium text-[#1c2f4d] ring-1 ring-[#e7ded0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => data.next && setUrl(data.next)}
                  disabled={!data.next}
                  className="rounded-full px-3 py-1.5 font-medium text-[#1c2f4d] ring-1 ring-[#e7ded0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-[#5a6a85]">No employees found.</p>
        )}
      </div>

      {isStaff && (
        <EmployeeFormModal
          isOpen={isModalOpen}
          employee={editingEmployee}
          departments={departments}
          managers={managerSelectOptions}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Employees
