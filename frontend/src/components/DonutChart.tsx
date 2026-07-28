import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  title: string
  slices: DonutSlice[]
  centerLabel?: string
}

function DonutChart({ title, slices, centerLabel }: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const primarySlice = slices[0]
  const primaryPercent = total > 0 && primarySlice ? Math.round((primarySlice.value / total) * 100) : 0

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-[#6b7280] uppercase">{title}</h2>
      {total === 0 ? (
        <p className="mt-4 text-sm text-[#6b7280]">No data yet.</p>
      ) : (
        <div className="mt-2 flex items-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="70%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {slices.map((slice) => (
                    <Cell key={slice.label} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-[#111827]">
                {centerLabel ?? `${primaryPercent}%`}
              </span>
            </div>
          </div>
          <ul className="flex-1 space-y-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[#6b7280]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  {slice.label}
                </span>
                <span className="font-medium text-[#111827]">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default DonutChart
