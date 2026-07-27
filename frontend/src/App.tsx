import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import ComingSoon from './pages/ComingSoon'
import Departments from './pages/Departments'
import Employees from './pages/Employees'
import Home from './pages/Home'
import LeaveRequests from './pages/LeaveRequests'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/leave-requests" element={<LeaveRequests />} />
              <Route path="/settings" element={<ComingSoon title="Settings" />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
