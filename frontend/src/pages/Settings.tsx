import axios from 'axios'
import { useRef, useState, type ChangeEvent } from 'react'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { apiClient } from '../lib/apiClient'

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Record<string, string[] | string>
    return Object.values(data)
      .map((messages) => (Array.isArray(messages) ? messages.join(' ') : messages))
      .join(' — ')
  }
  return 'Something went wrong. Please try again.'
}

function Settings() {
  const { user } = useAuth()
  const isStaff = Boolean(user?.is_staff)
  const { logoUrl, refreshSiteSettings } = useSiteSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      await apiClient.patch('/api/site-settings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refreshSiteSettings()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemove() {
    setError(null)
    setIsRemoving(true)
    try {
      await apiClient.delete('/api/site-settings/')
      await refreshSiteSettings()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#111827]">Settings</h1>

      <div className="mt-8 max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-[#111827]">Branding</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Upload your company logo to display it in the sidebar.
        </p>

        <div className="mt-5 flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#f8fafc] ring-1 ring-[#e5e7eb]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company logo"
                className="h-full w-full rounded-2xl object-contain p-2"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f46e5] text-lg font-bold text-white">
                H
              </span>
            )}
          </div>

          {isStaff && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRemoving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading && <Spinner className="h-4 w-4" />}
                  {logoUrl ? 'Replace logo' : 'Upload logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={handleRemove}
                    disabled={isUploading || isRemoving}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRemoving && <Spinner className="h-4 w-4" />}
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-[#9ca3af]">PNG or JPG recommended.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}

export default Settings
