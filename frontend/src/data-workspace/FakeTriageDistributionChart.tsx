import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  borderRadius: 8,
  boxShadow: 'none',
  color: '#000000',
  fontWeight: 600,
  fontSize: 12,
} as const

const axisTick = { fill: '#272727', fontSize: 11, fontWeight: 600 }

type Props = {
  likelyReal: number
  suspicious: number
  likelyFake: number
}

export function FakeTriageDistributionChart({ likelyReal, suspicious, likelyFake }: Props) {
  const data = [
    { label: 'Likely real', count: likelyReal, fill: '#c8e6c9' },
    { label: 'Suspicious', count: suspicious, fill: '#ffe17c' },
    { label: 'Likely fake', count: likelyFake, fill: '#ffcdd2' },
  ]
  const total = likelyReal + suspicious + likelyFake
  if (total === 0) {
    return <p className="chart-empty">Run detection to see triage distribution.</p>
  }

  return (
    <article className="chart-card fake-dist-chart">
      <h4>Triage distribution</h4>
      <p className="insights-legend">
        Suspicious = not flagged fake but risk score between {(0.35 * 100).toFixed(0)}% and the server
        threshold hint ({(0.6 * 100).toFixed(0)}%).
      </p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, left: 6, bottom: 8 }}>
            <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick}
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
            <Bar dataKey="count" stroke="#000000" strokeWidth={2} radius={[0, 0, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
