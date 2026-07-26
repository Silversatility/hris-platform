import { useAuth } from '../context/AuthContext'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-rose-100 text-rose-700',
}

function Home() {
  const { user } = useAuth()
  const firstName = user?.first_name || user?.email

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1c2f4d]">Dashboard</h1>
      <p className="mt-1 text-sm text-[#5a6a85]">Welcome back, {firstName}.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
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
    </div>
  )
}

export default Home
