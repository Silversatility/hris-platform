import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import DepartmentFormModal from '../components/DepartmentFormModal'
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { DepartmentRecord, PaginatedResponse } from '../types'

function Departments() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)

  const [data, setData] = useState<PaginatedResponse<DepartmentRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null)

  const loadDepartments = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<DepartmentRecord>>('/api/departments/')
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  function handleAdd() {
    setEditingDepartment(null)
    setIsModalOpen(true)
  }

  function handleEdit(department: DepartmentRecord) {
    setEditingDepartment(department)
    setIsModalOpen(true)
  }

  async function handleDelete(department: DepartmentRecord) {
    const confirmed = window.confirm(`Delete department "${department.name}"?`)
    if (!confirmed) return

    try {
      await apiClient.delete(`/api/departments/${department.id}/`)
      loadDepartments()
    } catch (err) {
      if (axios.isAxiosError(err) && Array.isArray(err.response?.data)) {
        window.alert(err.response.data[0])
      } else {
        window.alert(
          'Failed to delete department. It may still have employees assigned to it.'
        )
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111827]">Departments</h1>

        {isStaff && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Add Department
          </button>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#111827]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e5e7eb] text-xs font-semibold text-[#9ca3af] uppercase">
                <tr>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Employees</th>
                  <th className="px-6 py-3">Status</th>
                  {isStaff && <th className="px-6 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {data.results.map((department) => (
                  <tr key={department.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-[#111827]">{department.name}</p>
                      <p className="text-xs text-[#9ca3af]">{department.code}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                      {department.employee_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          department.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {department.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(department)}
                            title="Edit"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(department)}
                            title="Delete"
                            className="rounded-full p-1.5 text-[#6b7280] hover:bg-rose-50 hover:text-rose-600"
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
        ) : (
          <p className="p-8 text-center text-sm text-[#6b7280]">No departments found.</p>
        )}
      </div>

      {isStaff && (
        <DepartmentFormModal
          isOpen={isModalOpen}
          department={editingDepartment}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadDepartments}
        />
      )}
    </div>
  )
}

export default Departments
