import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/apiClient'
import type { EmployeeRecord } from '../types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-rose-100 text-rose-700',
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  intern: 'Intern',
}

function initials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  }
  return email[0]?.toUpperCase() ?? '?'
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data: unknown = err.response.data
    if (Array.isArray(data)) return data.join(' ')
    if (typeof data === 'object' && data !== null) {
      return Object.values(data as Record<string, string[] | string>)
        .map((messages) => (Array.isArray(messages) ? messages.join(' ') : messages))
        .join(' — ')
    }
  }
  return 'Something went wrong. Please try again.'
}

function inputClass() {
  return 'w-full rounded-xl border border-[#e7ded0] bg-white px-3 py-2 text-sm text-[#1c2f4d] outline-none focus:ring-2 focus:ring-[#1c2f4d]'
}

function readOnlyInputClass() {
  return 'w-full rounded-xl border border-[#e7ded0] bg-[#faf6ec] px-3 py-2 text-sm text-[#5a6a85]'
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold text-[#5a6a85] uppercase'
}

interface ProfileFormValues {
  first_name: string
  last_name: string
  personal_email: string
  phone_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

function Profile() {
  const { user, refreshUser } = useAuth()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState<ProfileFormValues>({
    first_name: '',
    last_name: '',
    personal_email: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setProfileForm((prev) => ({
      ...prev,
      first_name: user.first_name,
      last_name: user.last_name,
    }))

    if (!user.employee) {
      setIsLoading(false)
      return
    }
    apiClient
      .get<EmployeeRecord>(`/api/employees/${user.employee.id}/`)
      .then((response) => {
        setEmployee(response.data)
        setProfileForm((prev) => ({
          ...prev,
          personal_email: response.data.personal_email,
          phone_number: response.data.phone_number,
          emergency_contact_name: response.data.emergency_contact_name,
          emergency_contact_phone: response.data.emergency_contact_phone,
        }))
      })
      .catch(() => setLoadError('Failed to load profile.'))
      .finally(() => setIsLoading(false))
  }, [user?.id])

  function setProfileField<K extends keyof ProfileFormValues>(field: K, value: string) {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setIsSavingProfile(true)
    try {
      await apiClient.patch('/api/auth/me/', profileForm)
      if (user?.employee) {
        const response = await apiClient.get<EmployeeRecord>(
          `/api/employees/${user.employee.id}/`
        )
        setEmployee(response.data)
      }
      await refreshUser()
      setProfileSuccess(true)
    } catch (err) {
      setProfileError(extractErrorMessage(err))
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsSavingPassword(true)
    try {
      await apiClient.post('/api/auth/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      setPasswordSuccess(true)
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPasswordError(extractErrorMessage(err))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const displayName =
    user && (user.first_name || user.last_name)
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.email

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-[#1c2f4d]" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1c2f4d]">My Profile</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#1c2f4d] text-2xl font-bold text-[#f4efe2]">
              {user ? initials(user.first_name, user.last_name, user.email) : '?'}
            </span>
            <p className="mt-4 font-bold text-[#1c2f4d]">{displayName}</p>
            <p className="text-sm text-[#5a6a85]">{user?.email}</p>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-4 text-sm font-semibold text-[#5a6a85] uppercase">
              Change Password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className={labelClass()}>Old Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.old_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                  }
                  className={inputClass()}
                />
              </div>
              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-600">Password updated.</p>}
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-5 py-2.5 text-sm font-bold text-[#f4efe2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPassword && <Spinner className="h-4 w-4" />}
                Change Password
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-4 text-sm font-semibold text-[#5a6a85] uppercase">
                Profile Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass()}>First Name</label>
                  <input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileField('first_name', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Last Name</label>
                  <input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileField('last_name', e.target.value)}
                    className={inputClass()}
                  />
                </div>
              </div>
            </section>

            {employee && (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <h2 className="mb-4 text-sm font-semibold text-[#5a6a85] uppercase">
                  Employment <span className="text-[#93a2bc] normal-case">(managed by HR)</span>
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass()}>Employee ID</label>
                    <input
                      readOnly
                      value={employee.employee_id}
                      className={readOnlyInputClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Job Title</label>
                    <input readOnly value={employee.job_title} className={readOnlyInputClass()} />
                  </div>
                  <div>
                    <label className={labelClass()}>Department</label>
                    <input
                      readOnly
                      value={employee.department_name}
                      className={readOnlyInputClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Manager</label>
                    <input
                      readOnly
                      value={employee.manager_name ?? '—'}
                      className={readOnlyInputClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Employment Type</label>
                    <input
                      readOnly
                      value={
                        EMPLOYMENT_TYPE_LABELS[employee.employment_type] ??
                        employee.employment_type
                      }
                      className={readOnlyInputClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Hire Date</label>
                    <input readOnly value={employee.hire_date} className={readOnlyInputClass()} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#5a6a85] uppercase">
                      Status
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        STATUS_STYLES[employee.status] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {employee.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-4 text-sm font-semibold text-[#5a6a85] uppercase">
                Contact Info
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass()}>Work Email</label>
                  <input readOnly value={user?.email ?? ''} className={readOnlyInputClass()} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass()}>Personal Email</label>
                  <input
                    type="email"
                    value={profileForm.personal_email}
                    onChange={(e) => setProfileField('personal_email', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass()}>Phone Number</label>
                  <input
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileField('phone_number', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Emergency Contact Name</label>
                  <input
                    value={profileForm.emergency_contact_name}
                    onChange={(e) => setProfileField('emergency_contact_name', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Emergency Contact Phone</label>
                  <input
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) => setProfileField('emergency_contact_phone', e.target.value)}
                    className={inputClass()}
                  />
                </div>
              </div>
            </section>

            {loadError && <p className="text-sm text-red-500">{loadError}</p>}
            {profileError && <p className="text-sm text-red-500">{profileError}</p>}
            {profileSuccess && <p className="text-sm text-emerald-600">Profile updated.</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1c2f4d] to-[#0d1b30] px-6 py-2.5 text-sm font-bold text-[#f4efe2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile && <Spinner className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
