export interface EmployeeRecord {
  id: number
  user: number
  user_email: string
  full_name: string
  employee_id: string
  department: number
  department_name: string
  manager: number | null
  manager_name: string | null
  job_title: string
  employment_type: string
  status: string
  hire_date: string
  termination_date: string | null
  salary: string | null
  personal_email: string
  phone_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

export interface DepartmentOption {
  id: number
  name: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
