export interface CalendarHighlight {
  date: string // YYYY-MM-DD
  color: string
  label: string
}

interface MiniCalendarProps {
  title: string
  highlights: CalendarHighlight[]
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function MiniCalendar({ title, highlights }: MiniCalendarProps) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(year, month, today.getDate())

  const highlightsByDate = new Map<string, CalendarHighlight[]>()
  for (const highlight of highlights) {
    const existing = highlightsByDate.get(highlight.date) ?? []
    existing.push(highlight)
    highlightsByDate.set(highlight.date, existing)
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#5a6a85] uppercase">{title}</h2>
        <span className="text-xs font-medium text-[#5a6a85]">{monthLabel}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="py-1 font-semibold text-[#93a2bc]">
            {label}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />
          const dateKey = toDateKey(year, month, day)
          const dayHighlights = highlightsByDate.get(dateKey)
          const isToday = dateKey === todayKey
          return (
            <span
              key={dateKey}
              title={dayHighlights?.map((h) => h.label).join(', ')}
              className={`relative flex h-8 w-8 items-center justify-center justify-self-center rounded-full ${
                isToday ? 'bg-[#1c2f4d] font-bold text-white' : 'text-[#1c2f4d]'
              }`}
              style={
                !isToday && dayHighlights?.[0]
                  ? { backgroundColor: `${dayHighlights[0].color}33` }
                  : undefined
              }
            >
              {day}
              {dayHighlights && !isToday && (
                <span
                  className="absolute bottom-0.5 h-1 w-1 rounded-full"
                  style={{ backgroundColor: dayHighlights[0].color }}
                />
              )}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export default MiniCalendar
