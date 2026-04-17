import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistogramBin } from './fakeDashboardModel'

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  borderRadius: 8,
  boxShadow: 'none',
  color: '#000000',
  fontWeight: 600,
  fontSize: 12,
} as const

const axisTick = { fill: '#272727', fontSize: 10, fontWeight: 600 }

type Props = {
  bins: HistogramBin[]
}

export function FakeConfidenceHistogram({ bins }: Props) {
  const total = bins.reduce((a, b) => a + b.count, 0)
  if (total === 0) {
    return <p className="chart-empty">No scores to chart yet.</p>
  }

  return (
    <article className="chart-card fake-dist-chart">
      <h4>Risk score distribution</h4>
      <p className="insights-legend">How many reviews fall into each fused fake-confidence band (0–100%).</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 16, right: 8, left: 4, bottom: 36 }}>
            <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={48}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000000' }}
            />
            <YAxis
              allowDecimals={false}
              tick={axisTick}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000000' }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#b3c7ff" stroke="#000000" strokeWidth={2} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
