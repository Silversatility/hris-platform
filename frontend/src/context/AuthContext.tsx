import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '../lib/apiClient'
import { clearTokens, setTokens } from '../lib/authStorage'

interface EmployeeSummary {
  id: number
  employee_id: string
  job_title: string
  department: string
  status: string
}

export interface CurrentUser {
  id: number
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  employee: EmployeeSummary | null
}

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function fetchCurrentUser() {
    try {
      const response = await apiClient.get<CurrentUser>('/api/auth/me/')
      setUser(response.data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    fetchCurrentUser().finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const response = await apiClient.post('/api/auth/token/', { email, password })
    setTokens(response.data.access, response.data.refresh)
    await fetchCurrentUser()
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
