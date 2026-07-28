import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BuildingIcon, CalendarIcon, PeopleIcon, WalletIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { apiClient } from '../../lib/apiClient'
import type { LeaveRequestRecord, NotificationRecord, PaginatedResponse } from '../../types'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiClient.get<PaginatedResponse<unknown>>('/api/employees/?status=active&page_size=1'),
      apiClient.get<PaginatedResponse<unknown>>('/api/departments/?is_active=true&page_size=1'),
      apiClient.get<PaginatedResponse<LeaveRequestRecord>>(
        '/api/leave-requests/?status=pending&page_size=5'
      ),
      apiClient.get<PaginatedResponse<unknown>>('/api/pay-runs/?status=draft&page_size=1'),
      apiClient.get<PaginatedResponse<NotificationRecord>>('/api/notifications/?page_size=5'),
    ])
      .then(([employeesRes, departmentsRes, leaveRes, payRunsRes, notificationsRes]) => {
        setStats({
          activeEmployees: employeesRes.data.count,
          departments: departmentsRes.data.count,
          pendingLeaveRequests: leaveRes.data.count,
          draftPayRuns: payRunsRes.data.count,
        })
        setPendingRequests(leaveRes.data.results)
        setNotifications(notificationsRes.data.results)
      })
      .finally(() => setIsLoading(false))
  }, [])

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
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
    </div>
  )
}

export default StaffDashboard
