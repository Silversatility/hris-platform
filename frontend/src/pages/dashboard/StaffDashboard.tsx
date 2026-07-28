import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarHighlight } from '../../components/MiniCalendar'
import MiniCalendar from '../../components/MiniCalendar'
import type { MonthlyBarDatum } from '../../components/MonthlyBarChart'
import MonthlyBarChart from '../../components/MonthlyBarChart'
import DonutChart, { type DonutSlice } from '../../components/DonutChart'
import {
  BuildingIcon,
  CalendarIcon,
  CarIcon,
  CheckBadgeIcon,
  PeopleIcon,
  TrophyIcon,
  WalletIcon,
} from '../../components/icons'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { apiClient } from '../../lib/apiClient'
import type {
  EmployeeRecord,
  LeaveRequestRecord,
  NotificationRecord,
  PaginatedResponse,
  PayRunRecord,
  SaleRecord,
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

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

interface Stats {
  activeEmployees: number
  departments: number
  pendingLeaveRequests: number
  draftPayRuns: number
}

interface AgentTotal {
  name: string
  cars: number
  revenue: number
}

interface AttendanceSummary {
  perfectCount: number
  totalActive: number
  names: string[]
}

function StaffDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [employeeStatusSlices, setEmployeeStatusSlices] = useState<DonutSlice[]>([])
  const [leaveByMonth, setLeaveByMonth] = useState<MonthlyBarDatum[]>([])
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [carsSoldThisMonth, setCarsSoldThisMonth] = useState(0)
  const [profitThisMonth, setProfitThisMonth] = useState(0)
  const [topAgents, setTopAgents] = useState<AgentTotal[]>([])
  const [attendance, setAttendance] = useState<AttendanceSummary>({
    perfectCount: 0,
    totalActive: 0,
    names: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  useEffect(() => {
    const now = new Date()
    const nowMonth = now.getMonth()
    const monthStart = new Date(currentYear, nowMonth, 1)
    const monthEnd = new Date(currentYear, nowMonth + 1, 0)

    Promise.all([
      apiClient.get<PaginatedResponse<EmployeeRecord>>('/api/employees/?page_size=200'),
      apiClient.get<PaginatedResponse<unknown>>('/api/departments/?is_active=true&page_size=1'),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>(
        '/api/leave-requests/?status=pending&page_size=5'
      ),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>('/api/leave-requests/?page_size=200'),
      apiClient.get<PaginatedResponse<PayRunRecord>>('/api/pay-runs/?page_size=50'),
      apiClient.get<PaginatedResponse<NotificationRecord>>('/api/notifications/?page_size=5'),
      apiClient.get<PaginatedResponse<SaleRecord>>('/api/sales/?page_size=200'),
    ]).then(
      ([
        employeesRes,
        departmentsRes,
        pendingLeaveRes,
        allLeaveRes,
        payRunsRes,
        notificationsRes,
        salesRes,
      ]) => {
        const employees = employeesRes.data.results
        const activeEmployees = employees.filter((e) => e.status === 'active')
        const draftPayRuns = payRunsRes.data.results.filter((p) => p.status === 'draft').length

        setStats({
          activeEmployees: activeEmployees.length,
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
            color: STATUS_COLORS[status] ?? '#9ca3af',
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

        const highlights: CalendarHighlight[] = []
        const employeesOnLeaveThisMonth = new Set<number>()
        for (const request of allLeaveRes.data.results) {
          if (request.status !== 'approved') continue
          const start = new Date(request.start_date)
          const end = new Date(request.end_date)
          if (start <= monthEnd && end >= monthStart) {
            employeesOnLeaveThisMonth.add(request.employee)
          }
          if (start.getFullYear() === currentYear && start.getMonth() === nowMonth) {
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
              color: '#4f46e5',
              label: `Pay date (${payRun.status})`,
            })
          }
        }
        setCalendarHighlights(highlights)

        const perfectAttendees = activeEmployees.filter(
          (e) => !employeesOnLeaveThisMonth.has(e.id)
        )
        setAttendance({
          perfectCount: perfectAttendees.length,
          totalActive: activeEmployees.length,
          names: perfectAttendees.map((e) => e.full_name),
        })

        const salesThisMonth = salesRes.data.results.filter((sale) => {
          const date = new Date(sale.sale_date)
          return date.getFullYear() === currentYear && date.getMonth() === nowMonth
        })
        setCarsSoldThisMonth(salesThisMonth.length)
        const totalRevenue = salesThisMonth.reduce((sum, s) => sum + Number(s.sale_amount), 0)
        const totalCommission = salesThisMonth.reduce(
          (sum, s) => sum + Number(s.commission_amount),
          0
        )
        setProfitThisMonth(totalRevenue - totalCommission)

        const agentTotals = new Map<string, AgentTotal>()
        for (const sale of salesThisMonth) {
          const existing = agentTotals.get(sale.agent_display_name) ?? {
            name: sale.agent_display_name,
            cars: 0,
            revenue: 0,
          }
          existing.cars += 1
          existing.revenue += Number(sale.sale_amount)
          agentTotals.set(sale.agent_display_name, existing)
        }
        setTopAgents(
          Array.from(agentTotals.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        )
      }
    ).finally(() => setIsLoading(false))
  }, [currentYear, previousYear])

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner className="h-8 w-8 text-[#111827]" />
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
          color="indigo"
        />
        <StatCard
          label="Departments"
          value={stats.departments}
          icon={BuildingIcon}
          to="/departments"
          color="gray"
        />
        <StatCard
          label="Pending Leave Requests"
          value={stats.pendingLeaveRequests}
          icon={CalendarIcon}
          to="/leave-requests"
          color="amber"
        />
        <StatCard
          label="Draft Pay Runs"
          value={stats.draftPayRuns}
          icon={WalletIcon}
          to="/payroll"
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Cars Sold This Month"
          value={carsSoldThisMonth}
          icon={CarIcon}
          to="/payroll"
          color="indigo"
        />
        <StatCard
          label="Profit This Month"
          value={formatPeso(profitThisMonth)}
          icon={WalletIcon}
          to="/payroll"
          color="amber"
        />
        <StatCard
          label="Perfect Attendance"
          value={`${attendance.perfectCount} / ${attendance.totalActive}`}
          icon={CheckBadgeIcon}
          color="gray"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#6b7280] uppercase">
              <TrophyIcon className="h-4 w-4" />
              Top Agents This Month
            </h2>
            <Link to="/payroll" className="text-xs font-semibold text-[#4f46e5] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {topAgents.length > 0 ? (
              topAgents.map((agent, index) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-xl bg-[#f9fafb] px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f46e5] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[#111827]">{agent.name}</p>
                      <p className="text-xs text-[#6b7280]">
                        {agent.cars} car{agent.cars > 1 ? 's' : ''} sold
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-[#111827]">{formatPeso(agent.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6b7280]">No sales recorded this month.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#6b7280] uppercase">
            <CheckBadgeIcon className="h-4 w-4" />
            Perfect Attendance
          </h2>
          <p className="mt-1 text-xs text-[#6b7280]">
            Active employees with no approved leave this month.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {attendance.names.length > 0 ? (
              <>
                {attendance.names.slice(0, 10).map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {name}
                  </span>
                ))}
                {attendance.names.length > 10 && (
                  <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#6b7280]">
                    +{attendance.names.length - 10} more
                  </span>
                )}
              </>
            ) : (
              <p className="text-sm text-[#6b7280]">No active employees on record.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#6b7280] uppercase">
              Pending Leave Requests
            </h2>
            <Link to="/leave-requests" className="text-xs font-semibold text-[#4f46e5] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl bg-[#f9fafb] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#111827]">{request.employee_display_name}</p>
                    <p className="text-xs text-[#6b7280]">
                      {request.leave_type_name} — {request.start_date} to {request.end_date}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6b7280]">No pending leave requests.</p>
            )}
          </div>
        </section>

        <MiniCalendar title="This Month" highlights={calendarHighlights} />
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className="text-sm">
                <p className="text-[#111827]">{notification.message}</p>
                <p className="text-xs text-[#9ca3af]">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6b7280]">No recent activity.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default StaffDashboard
