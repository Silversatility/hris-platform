import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import type { BranchOption, DepartmentOption, EmployeeRecord } from '../types'
import Modal from './Modal'
import Spinner from './Spinner'

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'terminated', label: 'Terminated' },
]

interface ManagerOption {
  id: number
  label: string
}

interface FormValues {
  email: string
  first_name: string
  last_name: string
  password: string
  employee_id: string
  department: string
  branch: string
  manager: string
  job_title: string
  employment_type: string
  status: string
  hire_date: string
  termination_date: string
  salary: string
  personal_email: string
  phone_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
  bank_name: string
  bank_account_number: string
  bank_account_holder_name: string
}

const EMPTY_VALUES: FormValues = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  employee_id: '',
  department: '',
  branch: '',
  manager: '',
  job_title: '',
  employment_type: 'full_time',
  status: 'active',
  hire_date: '',
  termination_date: '',
  salary: '',
  personal_email: '',
  phone_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder_name: '',
}

function valuesFromEmployee(employee: EmployeeRecord): FormValues {
  const [firstName, ...rest] = employee.full_name.split(' ')
  return {
    email: employee.user_email,
    first_name: firstName ?? '',
    last_name: rest.join(' '),
    password: '',
    employee_id: employee.employee_id,
    department: String(employee.department),
    branch: String(employee.branch),
    manager: employee.manager ? String(employee.manager) : '',
    job_title: employee.job_title,
    employment_type: employee.employment_type,
    status: employee.status,
    hire_date: employee.hire_date,
    termination_date: employee.termination_date ?? '',
    salary: employee.salary ?? '',
    personal_email: employee.personal_email,
    phone_number: employee.phone_number,
    emergency_contact_name: employee.emergency_contact_name,
    emergency_contact_phone: employee.emergency_contact_phone,
    bank_name: employee.bank_name,
    bank_account_number: employee.bank_account_number,
    bank_account_holder_name: employee.bank_account_holder_name,
  }
}

interface EmployeeFormModalProps {
  isOpen: boolean
  employee: EmployeeRecord | null
  departments: DepartmentOption[]
  branches: BranchOption[]
  managers: ManagerOption[]
  onClose: () => void
  onSaved: () => void
}

function inputClass(base = '') {
  return `w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#4f46e5] ${base}`
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold text-[#6b7280] uppercase'
}

function EmployeeFormModal({
  isOpen,
  employee,
  departments,
  branches,
  managers,
  onClose,
  onSaved,
}: EmployeeFormModalProps) {
  const isEdit = employee !== null
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setValues(employee ? valuesFromEmployee(employee) : EMPTY_VALUES)
  }, [isOpen, employee])

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const payload: Record<string, unknown> = {
      email: values.email,
      first_name: values.first_name,
      last_name: values.last_name,
      department: Number(values.department),
      branch: Number(values.branch),
      manager: values.manager ? Number(values.manager) : null,
      job_title: values.job_title,
      employment_type: values.employment_type,
      status: values.status,
      hire_date: values.hire_date,
      termination_date: values.termination_date || null,
      salary: values.salary || null,
      personal_email: values.personal_email,
      phone_number: values.phone_number,
      emergency_contact_name: values.emergency_contact_name,
      emergency_contact_phone: values.emergency_contact_phone,
      bank_name: values.bank_name,
      bank_account_number: values.bank_account_number,
      bank_account_holder_name: values.bank_account_holder_name,
    }
    if (!isEdit) {
      payload.password = values.password
      if (values.employee_id) payload.employee_id = values.employee_id
    }

    try {
      if (isEdit) {
        await apiClient.patch(`/api/employees/${employee.id}/`, payload)
      } else {
        await apiClient.post('/api/employees/', payload)
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <section>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
            Account
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass()}>Email</label>
              <input
                type="email"
                required
                value={values.email}
                onChange={(e) => setField('email', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>First name</label>
              <input
                value={values.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Last name</label>
              <input
                value={values.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
                className={inputClass()}
              />
            </div>
            {!isEdit && (
              <div className="col-span-2">
                <label className={labelClass()}>Temporary password</label>
                <input
                  type="password"
                  required
                  value={values.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className={inputClass()}
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
            Employment
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <div className="col-span-2">
                <label className={labelClass()}>Employee ID (auto-generated if blank)</label>
                <input
                  value={values.employee_id}
                  onChange={(e) => setField('employee_id', e.target.value)}
                  className={inputClass()}
                />
              </div>
            )}
            <div className="col-span-2">
              <label className={labelClass()}>Job title</label>
              <input
                required
                value={values.job_title}
                onChange={(e) => setField('job_title', e.target.value)}
                className={inputClass()}
              />
            </div>
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
            <div>
              <label className={labelClass()}>Manager</label>
              <select
                value={values.manager}
                onChange={(e) => setField('manager', e.target.value)}
                className={inputClass()}
              >
                <option value="">None</option>
                {managers
                  .filter((manager) => !employee || manager.id !== employee.id)
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelClass()}>Employment type</label>
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
            <div>
              <label className={labelClass()}>Hire date</label>
              <input
                type="date"
                required
                value={values.hire_date}
                onChange={(e) => setField('hire_date', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Termination date</label>
              <input
                type="date"
                value={values.termination_date}
                onChange={(e) => setField('termination_date', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass()}>Salary</label>
              <input
                type="number"
                step="0.01"
                value={values.salary}
                onChange={(e) => setField('salary', e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
            Contact
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass()}>Personal email</label>
              <input
                type="email"
                value={values.personal_email}
                onChange={(e) => setField('personal_email', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass()}>Phone number</label>
              <input
                value={values.phone_number}
                onChange={(e) => setField('phone_number', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Emergency contact name</label>
              <input
                value={values.emergency_contact_name}
                onChange={(e) => setField('emergency_contact_name', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Emergency contact phone</label>
              <input
                value={values.emergency_contact_phone}
                onChange={(e) => setField('emergency_contact_phone', e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-[#111827] uppercase">
            Banking
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass()}>Bank name</label>
              <input
                value={values.bank_name}
                onChange={(e) => setField('bank_name', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Account number</label>
              <input
                value={values.bank_account_number}
                onChange={(e) => setField('bank_account_number', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass()}>Account holder name</label>
              <input
                value={values.bank_account_holder_name}
                onChange={(e) => setField('bank_account_holder_name', e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
        </section>

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
            {isEdit ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EmployeeFormModal
