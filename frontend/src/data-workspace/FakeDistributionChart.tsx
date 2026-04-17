import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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
  likelyFake: number
}

export function FakeDistributionChart({ likelyReal, likelyFake }: Props) {
  const data = [
    { label: 'Likely real', count: likelyReal },
    { label: 'Likely fake', count: likelyFake },
  ]
  const total = likelyReal + likelyFake
  if (total === 0) {
    return <p className="chart-empty">Run fake detection to see the distribution.</p>
  }

  return (
    <article className="chart-card fake-dist-chart">
      <h4>Verdict distribution</h4>
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
            <Bar dataKey="count" fill="#ffe17c" stroke="#000000" strokeWidth={2} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
