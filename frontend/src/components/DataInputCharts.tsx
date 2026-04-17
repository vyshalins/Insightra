import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type NameValuePoint = { name: string; value: number }
export type TokenCountPoint = { token: string; count: number }

const CHART_FILLS = ['#171e19', '#b7c6c2', '#ffe17c', '#272727']

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

const barChartMargin = { top: 20, right: 12, left: 6, bottom: 8 }
const pieChartMargin = { top: 16, right: 16, left: 16, bottom: 16 }

type DataInputChartsProps = {
  languageChartData: NameValuePoint[]
  translationChartData: NameValuePoint[]
  qualityChartData: NameValuePoint[]
  topTokenData: TokenCountPoint[]
}

function ChartEmpty({ message }: { message: string }) {
  return <p className="chart-empty">{message}</p>
}

function DataInputCharts({
  languageChartData,
  translationChartData,
  qualityChartData,
  topTokenData,
}: DataInputChartsProps) {
  const langTotal = languageChartData.reduce((sum, row) => sum + row.value, 0)
  const transTotal = translationChartData.reduce((sum, row) => sum + row.value, 0)
  const qualityTotal = qualityChartData.reduce((sum, row) => sum + row.value, 0)
  const tokenTotal = topTokenData.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="charts-grid">
      <article className="chart-card">
        <h4>Language Distribution</h4>
        <div className="chart-wrap">
          {!languageChartData.length || langTotal === 0 ? (
            <ChartEmpty message="No language data for the current filter." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languageChartData} margin={barChartMargin}>
                <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#171e19" radius={[0, 0, 0, 0]} stroke="#000000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="chart-card">
        <h4>Translated vs Non-translated</h4>
        <div className="chart-wrap">
          {transTotal === 0 ? (
            <ChartEmpty message="No translation breakdown for the current filter." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={pieChartMargin}>
                <Pie
                  data={translationChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={{ fill: '#000000', fontSize: 12, fontWeight: 700 }}
                  stroke="#000000"
                  strokeWidth={2}
                >
                  {translationChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_FILLS[index % CHART_FILLS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="chart-card">
        <h4>Dataset Quality Signals</h4>
        <div className="chart-wrap">
          {!qualityChartData.length || qualityTotal === 0 ? (
            <ChartEmpty message="No quality metrics to display yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityChartData} margin={barChartMargin}>
                <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#b7c6c2" radius={[0, 0, 0, 0]} stroke="#000000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="chart-card">
        <h4>Top Tokens in Cleaned Text</h4>
        <div className="chart-wrap">
          {!topTokenData.length || tokenTotal === 0 ? (
            <ChartEmpty message="No token frequency data for the current filter." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTokenData} margin={barChartMargin}>
                <CartesianGrid stroke="#272727" strokeWidth={1} vertical={false} />
                <XAxis dataKey="token" tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={{ stroke: '#000000', strokeWidth: 2 }} tickLine={{ stroke: '#000000' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#ffe17c" radius={[0, 0, 0, 0]} stroke="#000000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
    </div>
  )
}

export default memo(DataInputCharts)
