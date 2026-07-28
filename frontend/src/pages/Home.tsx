import { useAuth } from '../context/AuthContext'
import EmployeeDashboard from './dashboard/EmployeeDashboard'
import StaffDashboard from './dashboard/StaffDashboard'

function Home() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1c2f4d]">Dashboard</h1>
      <div className="mt-6">{user?.is_staff ? <StaffDashboard /> : <EmployeeDashboard />}</div>
    </div>
  )
}

export default Home
