import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendFeatureResult } from '../api'

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 12,
} as const

const tick = { fill: '#272727', fontSize: 10, fontWeight: 600 }

type Props = {
  trends: TrendFeatureResult[]
  topN?: number
}

export function TrendTopMoversChart({ trends, topN = 3 }: Props) {
  const data = [...trends]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, topN)
    .map((t) => ({
      feature: t.feature,
      prev_pct: Math.round(t.prev_rate * 1000) / 10,
      curr_pct: Math.round(t.current_rate * 1000) / 10,
    }))

  if (data.length === 0) {
    return <p className="chart-empty">No trend rows to chart.</p>
  }

  return (
    <article className="chart-card fake-dist-chart">
      <h4>Top movers (mention rate %)</h4>
      <p className="insights-legend">Previous vs current window for the three largest absolute deltas.</p>
      <div className="chart-wrap" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
            <XAxis dataKey="feature" tick={tick} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
            <YAxis
              tick={tick}
              axisLine={{ stroke: '#000', strokeWidth: 2 }}
              label={{ value: '% of reviews', angle: -90, position: 'insideLeft', offset: 10, style: tick }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar name="Previous" dataKey="prev_pct" fill="#e0e0e0" stroke="#000" strokeWidth={2} />
            <Bar name="Current" dataKey="curr_pct" fill="#ffe17c" stroke="#000" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
