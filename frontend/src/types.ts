export interface EmployeeRecord {
  id: number
  user: number
  user_email: string
  full_name: string
  employee_id: string
  department: number
  department_name: string
  branch: number
  branch_name: string
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
  bank_name: string
  bank_account_number: string
  bank_account_holder_name: string
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

export interface BranchOption {
  id: number
  name: string
}

export interface BranchRecord {
  id: number
  name: string
  code: string
  address: string
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

export interface SalesAgentRecord {
  id: number
  agent_id: string
  branch: number
  branch_name: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone_number: string
  default_commission_rate: string
  status: string
  date_joined: string
  bank_name: string
  bank_bic: string
  bank_account_number: string
  bank_account_holder_name: string
}

export interface SaleRecord {
  id: number
  agent: number
  agent_display_name: string
  sale_date: string
  customer_name: string
  vehicle_description: string
  sale_amount: string
  commission_rate: string
  commission_amount: string
  notes: string
  created_at: string
}

export interface PayRunRecord {
  id: number
  start_date: string
  end_date: string
  pay_date: string
  status: string
  payslip_count: number
  commission_payout_count: number
  created_at: string
}

export interface PayslipLineItemRecord {
  id: number
  payslip: number
  item_type: string
  label: string
  amount: string
}

export interface PayslipRecord {
  id: number
  pay_run: number
  employee: number
  employee_display_name: string
  employee_code: string
  employee_job_title: string
  employee_department: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  base_salary: string
  gross_pay: string
  total_deductions: string
  net_pay: string
  line_items: PayslipLineItemRecord[]
  is_paid: boolean
  paid_at: string | null
  payment_method: string
  payment_reference: string
  generated_at: string
}

export interface CommissionLineItemRecord {
  id: number
  payout: number
  sale: number | null
  label: string
  amount: string
  is_automatic: boolean
}

export interface CommissionPayoutRecord {
  id: number
  pay_run: number
  agent: number
  agent_display_name: string
  line_items: CommissionLineItemRecord[]
  total_commission: string
  is_paid: boolean
  paid_at: string | null
  payment_method: string
  payment_reference: string
  generated_at: string
}

export interface NotificationRecord {
  id: number
  message: string
  link: string
  is_read: boolean
  created_at: string
}

export interface TicketCommentRecord {
  id: number
  ticket: number
  author: number
  author_name: string
  body: string
  created_at: string
}

export interface TicketRecord {
  id: number
  ticket_number: string
  requester: number
  requester_name: string
  category: string
  subject: string
  description: string
  priority: string
  status: string
  assigned_to: number | null
  assigned_to_name: string | null
  sla_due_at: string
  is_overdue: boolean
  resolved_at: string | null
  comments: TicketCommentRecord[]
  created_at: string
  updated_at: string
}

export interface COERequestRecord {
  id: number
  employee: number
  employee_display_name: string
  employee_code: string
  employee_job_title: string
  employee_department: string
  employee_branch: string
  employee_employment_type: string
  employee_status: string
  employee_hire_date: string
  purpose: string
  status: string
  reviewed_by: number | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface SiteSettingsRecord {
  logo: string | null
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
