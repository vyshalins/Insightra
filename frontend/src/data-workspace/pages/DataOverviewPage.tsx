import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import '../../components/DataInputPanel.css'

function formatPct(n: number) {
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export default function DataOverviewPage() {
  const {
    metrics,
    result,
    allRecords,
    insights,
    fakeResults,
    insightsLoading,
    insightsError,
  } = useDataWorkspace()

  const invalid = result?.invalid_rows ?? 0
  const total = metrics.total
  const langs = metrics.uniqueLanguages
  const translatedPctDisplay = `${metrics.translatedPct.toFixed(1)}%`

  const fakeAvg =
    fakeResults && fakeResults.length
      ? fakeResults.reduce((s, r) => s + (r.ml_fake_prob ?? r.fake_confidence), 0) / fakeResults.length
      : null

  const donutData =
    metrics.languageChartData?.length > 0
      ? metrics.languageChartData.slice(0, 5).map((d) => ({ name: d.name, value: d.value }))
      : total > 0
        ? [{ name: 'In workspace', value: total }]
        : [{ name: 'Empty', value: 1 }]

  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', '#94a3b8']

  const aiBody =
    insights?.recommendations?.[0] ??
    'Ingest fresh reviews and run insights on analytics pages to unlock urgency, trends, and recommendation strips.'

  const urgencyLine =
    insights &&
    `Urgency ${insights.urgency_level} (${insights.urgency_score.toFixed(2)}) — keep windows current for sharper signals.`

  return (
    <div className="data-input-panel overview-page">
      <div className="overview-kpi-row">
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Total reviews</p>
          <p className="overview-kpi__value">{total.toLocaleString()}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">In workspace</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Invalid rows (last ingest)</p>
          <p className="overview-kpi__value">{invalid.toLocaleString()}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">From API response</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Languages detected</p>
          <p className="overview-kpi__value">{langs.toLocaleString()}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">Unique codes</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Translated share</p>
          <p className="overview-kpi__value">{translatedPctDisplay}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">Of visible rows</span>
        </article>
      </div>

      <div className="overview-mid">
        <section className="nb-card overview-chart-card">
          <h2 className="overview-chart-card__title">Language mix</h2>
          <div className="overview-donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>
                  {donutData.map((_, i) => (
                    <Cell key={String(i)} fill={COLORS[i % COLORS.length]} stroke="var(--nb-white)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v ?? '—', 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <InsightKeyCallout title="AI tip" body={aiBody} severity="info" />
        </section>

        <section className="nb-card overview-side-card">
          <h2 className="overview-chart-card__title">Pipeline signals</h2>
          <ul className="overview-list">
            <li>
              <span>Rows loaded</span>
              <strong>{allRecords.length.toLocaleString()}</strong>
            </li>
            <li>
              <span>Fake batch scored</span>
              <strong>{fakeResults?.length?.toLocaleString() ?? '—'}</strong>
            </li>
            <li>
              <span>Avg fake probability</span>
              <strong>{fakeAvg != null ? formatPct(fakeAvg) : '—'}</strong>
            </li>
            <li>
              <span>Insights status</span>
              <strong>
                {insightsLoading ? 'Loading…' : insightsError ? 'Error' : insights ? 'Ready' : 'Not run'}
              </strong>
            </li>
          </ul>
          {urgencyLine ? <p className="overview-muted">{urgencyLine}</p> : null}
          {insights?.recommendations?.length ? (
            <InsightRecommendationStrip recommendations={insights.recommendations} maxItems={4} />
          ) : null}
        </section>
      </div>

      <div className="overview-actions">
        <Link className="nb-btn nb-btn--push" to="/app/data/ingest">
          Go to ingestion
        </Link>
        <Link className="nb-btn nb-btn--secondary" to="/app/data/intelligence/features">
          Feature extraction
        </Link>
        <Link className="nb-btn nb-btn--secondary" to="/app/data/decision/recommendations">
          Recommendations
        </Link>
      </div>
    </div>
  )
}
