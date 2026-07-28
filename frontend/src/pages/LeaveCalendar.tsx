import { useEffect, useMemo, useState } from 'react'
import Spinner from '../components/Spinner'
import { apiClient } from '../lib/apiClient'
import type { LeaveRequestRecord, PaginatedResponse } from '../types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const COLOR_PALETTE = [
  { bg: '#4f46e5', text: '#ffffff' },
  { bg: '#d97706', text: '#ffffff' },
  { bg: '#059669', text: '#ffffff' },
  { bg: '#e11d48', text: '#ffffff' },
  { bg: '#0284c7', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
]

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function LeaveCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<LeaveRequestRecord>>(
        '/api/leave-requests/?status=approved&page_size=200'
      )
      .then((response) => setLeaveRequests(response.data.results))
      .catch(() => setError('Failed to load leave requests.'))
      .finally(() => setIsLoading(false))
  }, [])

  const leaveTypeColors = useMemo(() => {
    const map = new Map<string, { bg: string; text: string }>()
    let index = 0
    for (const request of leaveRequests) {
      if (!map.has(request.leave_type_name)) {
        map.set(request.leave_type_name, COLOR_PALETTE[index % COLOR_PALETTE.length])
        index += 1
      }
    }
    return map
  }, [leaveRequests])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, LeaveRequestRecord[]>()
    for (const request of leaveRequests) {
      const start = parseDate(request.start_date)
      const end = parseDate(request.end_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d)
        const existing = map.get(key) ?? []
        existing.push(request)
        map.set(key, existing)
      }
    }
    return map
  }, [leaveRequests])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayKey = toDateKey(today)

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function goToToday() {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  function goToPrevMonth() {
    setCursor(new Date(year, month - 1, 1))
  }

  function goToNextMonth() {
    setCursor(new Date(year, month + 1, 1))
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#111827]">Leave Calendar</h1>
      <p className="mt-1 text-sm text-[#6b7280]">
        Approved leave for everyone you can view, by month.
      </p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={goToPrevMonth}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#111827] ring-1 ring-[#e5e7eb] hover:bg-[#f9fafb]"
            >
              Prev
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#111827] ring-1 ring-[#e5e7eb] hover:bg-[#f9fafb]"
            >
              Next
            </button>
            <button
              onClick={goToToday}
              className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm font-semibold text-[#111827] hover:bg-[#e5e7eb]"
            >
              Today
            </button>
          </div>
          <h2 className="text-lg font-bold tracking-wide text-[#111827] uppercase">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <div className="w-[186px]" />
        </div>

        {leaveTypeColors.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {Array.from(leaveTypeColors.entries()).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color.bg }}
                />
                {label}
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#111827]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl ring-1 ring-[#e5e7eb]">
            <div className="grid grid-cols-7 border-b border-[#e5e7eb] bg-[#f9fafb]">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-3 py-2 text-center text-xs font-semibold text-[#6b7280] uppercase"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-28 border-r border-b border-[#e5e7eb] bg-[#f9fafb] last:border-r-0"
                    />
                  )
                }
                const dateKey = toDateKey(new Date(year, month, day))
                const entries = entriesByDate.get(dateKey) ?? []
                const isToday = dateKey === todayKey
                const visibleEntries = entries.slice(0, 3)
                const overflowCount = entries.length - visibleEntries.length

                return (
                  <div
                    key={dateKey}
                    className="h-28 overflow-hidden border-r border-b border-[#e5e7eb] p-1.5 last:border-r-0"
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-[#4f46e5] text-white' : 'text-[#111827]'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {visibleEntries.map((entry) => {
                        const color = leaveTypeColors.get(entry.leave_type_name) ?? COLOR_PALETTE[0]
                        return (
                          <div
                            key={`${entry.id}-${dateKey}`}
                            title={`${entry.employee_display_name} — ${entry.leave_type_name}`}
                            className="truncate rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {entry.employee_display_name}
                          </div>
                        )
                      })}
                      {overflowCount > 0 && (
                        <p className="px-1.5 text-[10px] text-[#9ca3af]">+{overflowCount} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaveCalendar
