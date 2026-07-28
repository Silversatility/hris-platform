import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarHighlight } from '../../components/MiniCalendar'
import MiniCalendar from '../../components/MiniCalendar'
import DonutChart, { type DonutSlice } from '../../components/DonutChart'
import { CalendarIcon, PeopleIcon, WalletIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { useAuth } from '../../context/AuthContext'
import { apiClient } from '../../lib/apiClient'
import type {
  LeaveBalanceRecord,
  LeaveRequestRecord,
  NotificationRecord,
  PaginatedResponse,
  PayslipRecord,
} from '../../types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-rose-100 text-rose-700',
}

function EmployeeDashboard() {
  const { user } = useAuth()
  const employeeId = user?.employee?.id
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([])
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRecord[]>([])
  const [payslips, setPayslips] = useState<PayslipRecord[]>([])
  const [totalPayslips, setTotalPayslips] = useState(0)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [isLoading, setIsLoading] = useState(employeeId !== undefined)

  useEffect(() => {
    if (!employeeId) return
    const now = new Date()
    const year = now.getFullYear()
    Promise.all([
      apiClient.get<PaginatedResponse<LeaveBalanceRecord>>(
        `/api/leave-balances/?employee=${employeeId}&year=${year}`
      ),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>(
        `/api/leave-requests/?employee=${employeeId}&status=pending`
      ),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>(
        `/api/leave-requests/?employee=${employeeId}&status=approved&page_size=50`
      ),
      apiClient.get<PaginatedResponse<PayslipRecord>>(
        `/api/payslips/?employee=${employeeId}&page_size=3`
      ),
      apiClient.get<PaginatedResponse<NotificationRecord>>('/api/notifications/?page_size=5'),
    ]).then(([balancesRes, pendingRes, approvedRes, payslipsRes, notificationsRes]) => {
      setBalances(balancesRes.data.results)
      setPendingRequests(pendingRes.data.results)
      setPayslips(payslipsRes.data.results)
      setTotalPayslips(payslipsRes.data.count)
      setNotifications(notificationsRes.data.results)

      const highlights: CalendarHighlight[] = approvedRes.data.results
        .filter((request) => {
          const date = new Date(request.start_date)
          return date.getFullYear() === year && date.getMonth() === now.getMonth()
        })
        .map((request) => ({
          date: request.start_date,
          color: '#10b981',
          label: `${request.leave_type_name} leave`,
        }))
      setCalendarHighlights(highlights)
    }).finally(() => setIsLoading(false))
  }, [employeeId])

  const firstName = user?.first_name || user?.email
  const remainingDays = balances.reduce((sum, b) => sum + Number(b.remaining_days), 0)
  const usedDays = balances.reduce((sum, b) => sum + Number(b.used_days), 0)
  const leaveSlices: DonutSlice[] = [
    { label: 'Remaining', value: remainingDays, color: '#10b981' },
    { label: 'Used', value: usedDays, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-8">
      <p className="text-sm text-[#5a6a85]">Welcome back, {firstName}.</p>

      {user?.employee && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Leave Days Remaining"
            value={remainingDays}
            icon={CalendarIcon}
            to="/leave-requests"
            highlight
          />
          <StatCard
            label="Pending Requests"
            value={pendingRequests.length}
            icon={PeopleIcon}
            to="/leave-requests"
          />
          <StatCard label="Total Payslips" value={totalPayslips} icon={WalletIcon} to="/payroll" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#5a6a85]">Name</dt>
              <dd className="font-medium text-[#1c2f4d]">
                {user?.first_name || user?.last_name
                  ? `${user?.first_name} ${user?.last_name}`.trim()
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5a6a85]">Email</dt>
              <dd className="font-medium text-[#1c2f4d]">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5a6a85]">Role</dt>
              <dd className="font-medium text-[#1c2f4d]">
                {user?.is_staff ? 'HR Staff' : 'Employee'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">Employment</h2>
          {user?.employee ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#5a6a85]">Employee ID</dt>
                <dd className="font-medium text-[#1c2f4d]">{user.employee.employee_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#5a6a85]">Job Title</dt>
                <dd className="font-medium text-[#1c2f4d]">{user.employee.job_title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#5a6a85]">Department</dt>
                <dd className="font-medium text-[#1c2f4d]">{user.employee.department}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#5a6a85]">Status</dt>
                <dd>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      STATUS_STYLES[user.employee.status] ?? 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.employee.status.replace('_', ' ')}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[#5a6a85]">
              No employee record linked to this account.
            </p>
          )}
        </section>
      </div>

      {!user?.employee ? null : isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Spinner className="h-6 w-6 text-[#1c2f4d]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DonutChart title="Leave Balance" slices={leaveSlices} />
            <MiniCalendar title="My Leave This Month" highlights={calendarHighlights} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">Recent Payslips</h2>
                <Link to="/payroll" className="text-xs font-semibold text-[#1c2f4d] hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {payslips.length > 0 ? (
                  payslips.map((payslip) => (
                    <div key={payslip.id} className="flex justify-between text-sm">
                      <span className="text-[#5a6a85]">{payslip.generated_at.slice(0, 10)}</span>
                      <span className="font-medium text-[#1c2f4d]">{payslip.net_pay}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#5a6a85]">No payslips yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">Recent Activity</h2>
              <div className="mt-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div key={notification.id} className="text-sm">
                      <p className="text-[#1c2f4d]">{notification.message}</p>
                      <p className="text-xs text-[#93a2bc]">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#5a6a85]">No recent activity.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default EmployeeDashboard
