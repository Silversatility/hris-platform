import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '../lib/apiClient'
import { clearTokens, getRefreshToken, setTokens } from '../lib/authStorage'

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
  isLoggingOut: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  async function logout() {
    setIsLoggingOut(true)
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await apiClient.post('/api/auth/logout/', { refresh: refreshToken })
      }
    } catch {
      // Best-effort: even if blacklisting fails (e.g. already expired,
      // network down), still clear local tokens so the user isn't stuck.
    } finally {
      clearTokens()
      setUser(null)
      setIsLoggingOut(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoggingOut, login, logout }}>
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
