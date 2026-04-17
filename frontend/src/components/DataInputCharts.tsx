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

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--color-danger)',
  'var(--color-badge-yes-fg)',
]

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
              <BarChart data={languageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
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
              <PieChart>
                <Pie
                  data={translationChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {translationChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
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
              <BarChart data={qualityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[8, 8, 0, 0]} />
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
              <BarChart data={topTokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="token" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
    </div>
  )
}

export default memo(DataInputCharts)
