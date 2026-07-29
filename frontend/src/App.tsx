import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import Branches from './pages/Branches'
import COEPrintView from './pages/COEPrintView'
import COERequests from './pages/COERequests'
import Departments from './pages/Departments'
import Employees from './pages/Employees'
import Home from './pages/Home'
import LeaveCalendar from './pages/LeaveCalendar'
import LeaveRequests from './pages/LeaveRequests'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Payroll from './pages/Payroll'
import PayslipPrintView from './pages/PayslipPrintView'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Tickets from './pages/Tickets'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteSettingsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/payslips/:id/print" element={<PayslipPrintView />} />
              <Route path="/coe-requests/:id/print" element={<COEPrintView />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/leave-requests" element={<LeaveRequests />} />
                <Route path="/leave-calendar" element={<LeaveCalendar />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/coe-requests" element={<COERequests />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SiteSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
