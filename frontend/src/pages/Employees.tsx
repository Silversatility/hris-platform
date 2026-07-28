import { useCallback, useEffect, useMemo, useState } from 'react'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { BranchOption, DepartmentRecord, EmployeeRecord, PaginatedResponse } from '../types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-rose-100 text-rose-700',
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase() || '?'
}

function Employees() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)

  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [managerOptions, setManagerOptions] = useState<EmployeeRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)

  const loadDepartments = useCallback(() => {
    setIsLoadingDepartments(true)
    apiClient
      .get<PaginatedResponse<DepartmentRecord>>('/api/departments/?page_size=100')
      .then((response) => {
        setDepartments(response.data.results)
        setSelectedDeptId((current) => current ?? response.data.results[0]?.id ?? null)
      })
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setIsLoadingDepartments(false))
  }, [])

  const loadEmployees = useCallback(() => {
    if (selectedDeptId === null) return
    setIsLoadingEmployees(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<EmployeeRecord>>(
        `/api/employees/?department=${selectedDeptId}&page_size=100`
      )
      .then((response) => setEmployees(response.data.results))
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setIsLoadingEmployees(false))
  }, [selectedDeptId])

  const loadManagerOptions = useCallback(() => {
    if (!isStaff) return
    fetchAllEmployees()
      .then(setManagerOptions)
      .catch(() => setManagerOptions([]))
  }, [isStaff])

  const loadBranches = useCallback(() => {
    apiClient
      .get<PaginatedResponse<BranchOption>>('/api/branches/?page_size=100')
      .then((response) => setBranches(response.data.results))
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

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
    loadDepartments()
    loadManagerOptions()
    loadBranches()
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
      loadDepartments()
      loadManagerOptions()
      loadBranches()
    } catch {
      window.alert('Failed to delete employee.')
    }
  }

  const managerSelectOptions = managerOptions.map((manager) => ({
    id: manager.id,
    label: manager.full_name || manager.user_email,
  }))

  const selectedDepartment = departments.find((d) => d.id === selectedDeptId) ?? null

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) =>
      (employee.full_name || employee.user_email).toLowerCase().includes(query)
    )
  }, [employees, search])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111827]">Employees</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="rounded-full bg-white py-2 pr-4 pl-10 text-sm text-[#111827] shadow-sm ring-1 ring-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold text-[#6b7280] uppercase">Departments</p>
            <p className="mt-1 text-lg font-bold text-[#111827]">
              {isLoadingDepartments ? '—' : departments.length}
            </p>
          </div>

          {isLoadingDepartments ? (
            <div className="flex items-center justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
              <Spinner className="h-6 w-6 text-[#111827]" />
            </div>
          ) : (
            departments.map((department) => {
              const isSelected = department.id === selectedDeptId
              return (
                <button
                  key={department.id}
                  onClick={() => setSelectedDeptId(department.id)}
                  className={`w-full rounded-2xl p-4 text-left shadow-sm ring-1 transition-colors ${
                    isSelected
                      ? 'bg-[#4f46e5] text-white ring-[#4f46e5]'
                      : 'bg-white text-[#111827] ring-black/5 hover:bg-[#f9fafb]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{department.name}</p>
                    {!department.is_active && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isSelected ? 'text-[#c7d2fe]' : 'text-[#9ca3af]'}`}>
                    {department.code}
                  </p>
                  <p className={`mt-2 text-xs font-semibold ${isSelected ? 'text-[#e0e7ff]' : 'text-[#6b7280]'}`}>
                    {department.employee_count} employee{department.employee_count === 1 ? '' : 's'}
                  </p>
                </button>
              )
            })
          )}
        </div>

        <div>
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-bold text-[#111827]">
              {selectedDepartment ? selectedDepartment.name : 'Select a department'}
            </h2>
            {isStaff && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Employee
              </button>
            )}
          </div>

          <div className="mt-4">
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center rounded-2xl bg-white p-16 shadow-sm ring-1 ring-black/5">
                <Spinner className="h-8 w-8 text-[#111827]" />
              </div>
            ) : visibleEmployees.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e0e7ff] text-sm font-bold text-[#111827]">
                          {initials(employee.full_name || employee.user_email)}
                        </span>
                        <div>
                          <p className="font-semibold text-[#111827]">
                            {employee.full_name || employee.user_email}
                          </p>
                          <p className="text-xs text-[#6b7280]">{employee.job_title}</p>
                        </div>
                      </div>
                      {isStaff && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(employee)}
                            title="Edit"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            title="Delete"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-rose-50 hover:text-rose-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#9ca3af]">Email</span>
                        <span className="text-[#111827]">
                          {employee.personal_email || employee.user_email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9ca3af]">Phone</span>
                        <span className="text-[#111827]">{employee.phone_number || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9ca3af]">Branch</span>
                        <span className="text-[#111827]">{employee.branch_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9ca3af]">Manager</span>
                        <span className="text-[#111827]">{employee.manager_name ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#9ca3af]">Status</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            STATUS_STYLES[employee.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {employee.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#6b7280] shadow-sm ring-1 ring-black/5">
                {search ? 'No employees match your search.' : 'No employees in this department.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {isStaff && (
        <EmployeeFormModal
          isOpen={isModalOpen}
          employee={editingEmployee}
          departments={departments}
          branches={branches}
          managers={managerSelectOptions}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Employees
