export const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
}

export const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
}

export const CATEGORY_LABELS: Record<string, string> = {
  it: 'IT',
  hr: 'HR',
  facilities: 'Facilities',
  payroll: 'Payroll',
  other: 'Other',
}

export const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const BOARD_COLUMNS: { status: string; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'closed', label: 'Closed' },
]

// Bold header-bar colors per column, matching the same semantic status
// colors used elsewhere (STATUS_STYLES) so the board stays consistent
// with the rest of the app instead of introducing a new palette.
export const COLUMN_HEADER_STYLES: Record<string, string> = {
  open: 'bg-amber-500',
  in_progress: 'bg-sky-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-500',
}

// Which target columns a card can be dropped into, keyed by its current
// status. Mirrors exactly what the backend's assign/resolve/close/reopen
// actions actually allow -- dropping onto anything else is rejected.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['closed', 'open'],
  closed: ['open'],
}
