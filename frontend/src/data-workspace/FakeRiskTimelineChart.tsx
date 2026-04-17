import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RiskPoint } from './fakeDashboardModel'

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
  points: RiskPoint[]
}

function formatTs(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(ts)
  }
}

export function FakeRiskTimelineChart({ points }: Props) {
  if (points.length < 2) {
    return (
      <article className="chart-card fake-dist-chart">
        <h4>Risk over time</h4>
        <p className="chart-empty">Need at least two dated reviews to plot a trend.</p>
      </article>
    )
  }

  const data = points.map((p) => ({
    ...p,
    tLabel: formatTs(p.ts),
  }))

  return (
    <article className="chart-card fake-dist-chart">
      <h4>Risk over time</h4>
      <p className="insights-legend">Fused fake-confidence vs review timestamp (this batch only).</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTs}
              tick={axisTick}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000000' }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
              tick={axisTick}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000000' }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value)
                const pct = Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—'
                return [pct, 'Risk']
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { tLabel?: string } | undefined
                return row?.tLabel ?? ''
              }}
            />
            <Line type="monotone" dataKey="score" stroke="#000000" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
