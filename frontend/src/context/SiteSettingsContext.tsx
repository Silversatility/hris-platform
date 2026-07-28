import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '../lib/apiClient'
import type { SiteSettingsRecord } from '../types'

interface SiteSettingsContextValue {
  logoUrl: string | null
  refreshSiteSettings: () => Promise<void>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  async function fetchSiteSettings() {
    try {
      const response = await apiClient.get<SiteSettingsRecord>('/api/site-settings/')
      setLogoUrl(response.data.logo)
    } catch {
      setLogoUrl(null)
    }
  }

  useEffect(() => {
    fetchSiteSettings()
  }, [])

  return (
    <SiteSettingsContext.Provider value={{ logoUrl, refreshSiteSettings: fetchSiteSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}
