import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarHighlight } from '../../components/MiniCalendar'
import MiniCalendar from '../../components/MiniCalendar'
import type { MonthlyBarDatum } from '../../components/MonthlyBarChart'
import MonthlyBarChart from '../../components/MonthlyBarChart'
import DonutChart, { type DonutSlice } from '../../components/DonutChart'
import { BuildingIcon, CalendarIcon, PeopleIcon, WalletIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { apiClient } from '../../lib/apiClient'
import type {
  EmployeeRecord,
  LeaveRequestRecord,
  NotificationRecord,
  PaginatedResponse,
  PayRunRecord,
} from '../../types'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  on_leave: '#f59e0b',
  terminated: '#f43f5e',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  terminated: 'Terminated',
}

interface Stats {
  activeEmployees: number
  departments: number
  pendingLeaveRequests: number
  draftPayRuns: number
}

function StaffDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [employeeStatusSlices, setEmployeeStatusSlices] = useState<DonutSlice[]>([])
  const [leaveByMonth, setLeaveByMonth] = useState<MonthlyBarDatum[]>([])
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  useEffect(() => {
    const now = new Date()
    Promise.all([
      apiClient.get<PaginatedResponse<EmployeeRecord>>('/api/employees/?page_size=200'),
      apiClient.get<PaginatedResponse<unknown>>('/api/departments/?is_active=true&page_size=1'),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>(
        '/api/leave-requests/?status=pending&page_size=5'
      ),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>('/api/leave-requests/?page_size=200'),
      apiClient.get<PaginatedResponse<PayRunRecord>>('/api/pay-runs/?page_size=50'),
      apiClient.get<PaginatedResponse<NotificationRecord>>('/api/notifications/?page_size=5'),
    ]).then(
      ([
        employeesRes,
        departmentsRes,
        pendingLeaveRes,
        allLeaveRes,
        payRunsRes,
        notificationsRes,
      ]) => {
        const employees = employeesRes.data.results
        const activeEmployees = employees.filter((e) => e.status === 'active').length
        const draftPayRuns = payRunsRes.data.results.filter((p) => p.status === 'draft').length

        setStats({
          activeEmployees,
          departments: departmentsRes.data.count,
          pendingLeaveRequests: pendingLeaveRes.data.count,
          draftPayRuns,
        })
        setPendingRequests(pendingLeaveRes.data.results)
        setNotifications(notificationsRes.data.results)

        const statusCounts: Record<string, number> = {}
        for (const employee of employees) {
          statusCounts[employee.status] = (statusCounts[employee.status] ?? 0) + 1
        }
        setEmployeeStatusSlices(
          Object.entries(statusCounts).map(([status, count]) => ({
            label: STATUS_LABELS[status] ?? status,
            value: count,
            color: STATUS_COLORS[status] ?? '#93a2bc',
          }))
        )

        const monthly = MONTH_LABELS.map((month) => ({ month, previousYear: 0, currentYear: 0 }))
        for (const request of allLeaveRes.data.results) {
          const date = new Date(request.start_date)
          const year = date.getFullYear()
          const monthIndex = date.getMonth()
          if (year === currentYear) monthly[monthIndex].currentYear += 1
          else if (year === previousYear) monthly[monthIndex].previousYear += 1
        }
        setLeaveByMonth(monthly)

        const nowMonth = now.getMonth()
        const highlights: CalendarHighlight[] = []
        for (const request of allLeaveRes.data.results) {
          if (request.status !== 'approved') continue
          const date = new Date(request.start_date)
          if (date.getFullYear() === currentYear && date.getMonth() === nowMonth) {
            highlights.push({
              date: request.start_date,
              color: '#10b981',
              label: `${request.employee_display_name} on leave`,
            })
          }
        }
        for (const payRun of payRunsRes.data.results) {
          const date = new Date(payRun.pay_date)
          if (date.getFullYear() === currentYear && date.getMonth() === nowMonth) {
            highlights.push({
              date: payRun.pay_date,
              color: '#1c2f4d',
              label: `Pay date (${payRun.status})`,
            })
          }
        }
        setCalendarHighlights(highlights)
      }
    ).finally(() => setIsLoading(false))
  }, [currentYear, previousYear])

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner className="h-8 w-8 text-[#1c2f4d]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={stats.activeEmployees}
          icon={PeopleIcon}
          to="/employees"
          highlight
        />
        <StatCard
          label="Departments"
          value={stats.departments}
          icon={BuildingIcon}
          to="/departments"
        />
        <StatCard
          label="Pending Leave Requests"
          value={stats.pendingLeaveRequests}
          icon={CalendarIcon}
          to="/leave-requests"
        />
        <StatCard
          label="Draft Pay Runs"
          value={stats.draftPayRuns}
          icon={WalletIcon}
          to="/payroll"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyBarChart
            title="Leave Requests by Month"
            data={leaveByMonth}
            previousYearLabel={String(previousYear)}
            currentYearLabel={String(currentYear)}
          />
        </div>
        <DonutChart title="Employee Status" slices={employeeStatusSlices} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">
              Pending Leave Requests
            </h2>
            <Link to="/leave-requests" className="text-xs font-semibold text-[#1c2f4d] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl bg-[#faf6ec] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#1c2f4d]">{request.employee_display_name}</p>
                    <p className="text-xs text-[#5a6a85]">
                      {request.leave_type_name} — {request.start_date} to {request.end_date}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#5a6a85]">No pending leave requests.</p>
            )}
          </div>
        </section>

        <MiniCalendar title="This Month" highlights={calendarHighlights} />
      </div>

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
  )
}

export default StaffDashboard
