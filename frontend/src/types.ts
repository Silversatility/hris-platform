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

export interface DepartmentRecord {
  id: number
  name: string
  code: string
  is_active: boolean
  employee_count: number
}

export interface LeaveTypeRecord {
  id: number
  name: string
  code: string
  is_paid: boolean
  default_annual_days: string
}

export interface LeaveBalanceRecord {
  id: number
  employee: number
  leave_type: number
  leave_type_name: string
  year: number
  allocated_days: string
  used_days: string
  remaining_days: string
}

export interface LeaveRequestRecord {
  id: number
  employee: number
  employee_display_name: string
  leave_type: number
  leave_type_name: string
  start_date: string
  end_date: string
  days_requested: string
  reason: string
  status: string
  reviewed_by: number | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
