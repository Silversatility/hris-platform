import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface MonthlyBarDatum {
  month: string
  previousYear: number
  currentYear: number
}

interface MonthlyBarChartProps {
  title: string
  data: MonthlyBarDatum[]
  previousYearLabel: string
  currentYearLabel: string
}

function MonthlyBarChart({ title, data, previousYearLabel, currentYearLabel }: MonthlyBarChartProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase">{title}</h2>
        <div className="flex items-center gap-4 text-xs text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f5a95e]" />
            {previousYearLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f46e5]" />
            {currentYearLabel}
          </span>
        </div>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Bar dataKey="previousYear" fill="#f5a95e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="currentYear" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default MonthlyBarChart
