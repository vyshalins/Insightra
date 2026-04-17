import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import '../../components/DataInputPanel.css'

function formatPct(n: number) {
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export default function VoiceOverviewPage() {
  const { sessions, insights, fakeResults, insightsLoading, insightsError } = useVoiceWorkspace()

  const last = sessions[0]
  const preview = last?.transcript ? `${last.transcript.slice(0, 160)}${last.transcript.length > 160 ? '…' : ''}` : null

  const fakeAvg =
    fakeResults && fakeResults.length
      ? fakeResults.reduce((s, r) => s + (r.ml_fake_prob ?? r.fake_confidence), 0) / fakeResults.length
      : null

  const emotionCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    const k = (s.emotion || 'unknown').trim() || 'unknown'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const donutData = Object.entries(emotionCounts).map(([name, value]) => ({ name, value }))
  const chartData = donutData.length ? donutData : [{ name: 'No sessions', value: 1 }]

  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', '#94a3b8']

  const aiBody =
    insights?.recommendations?.[0] ??
    'Capture a few calls, run fake + insights on the intelligence pages, then route to recommendations for prioritized follow-ups.'

  const urgencyLine =
    insights &&
    `Urgency ${insights.urgency_level} (${insights.urgency_score.toFixed(2)}) from the last insights run.`

  return (
    <div className="data-input-panel overview-page">
      <div className="overview-kpi-row">
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Sessions</p>
          <p className="overview-kpi__value">{sessions.length.toLocaleString()}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">Voice captures</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Latest file</p>
          <p className="overview-kpi__value">{last ? last.fileName : '—'}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">Most recent upload</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Emotion tag (latest)</p>
          <p className="overview-kpi__value">{last?.emotion ?? '—'}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">From last analysis</span>
        </article>
        <article className="nb-card overview-kpi">
          <p className="overview-kpi__label">Avg fake probability</p>
          <p className="overview-kpi__value">{fakeAvg != null ? formatPct(fakeAvg) : '—'}</p>
          <span className="overview-kpi__delta overview-kpi__delta--muted">When batch is run</span>
        </article>
      </div>

      <div className="overview-mid">
        <section className="nb-card overview-chart-card">
          <h2 className="overview-chart-card__title">Emotion mix</h2>
          <div className="overview-donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>
                  {chartData.map((_, i) => (
                    <Cell key={String(i)} fill={COLORS[i % COLORS.length]} stroke="var(--nb-white)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v ?? '—', 'Sessions']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <InsightKeyCallout title="AI tip" body={aiBody} severity="info" />
        </section>

        <section className="nb-card overview-side-card">
          <h2 className="overview-chart-card__title">Latest transcript</h2>
          {preview ? <p className="overview-preview">{preview}</p> : <p className="overview-muted">No sessions yet.</p>}
          <ul className="overview-list">
            <li>
              <span>Insights status</span>
              <strong>
                {insightsLoading ? 'Loading…' : insightsError ? 'Error' : insights ? 'Ready' : 'Not run'}
              </strong>
            </li>
            <li>
              <span>Open issues (latest)</span>
              <strong>{last?.issues?.length ?? 0}</strong>
            </li>
            <li>
              <span>Suggested actions (latest)</span>
              <strong>{last?.actions?.length ?? 0}</strong>
            </li>
          </ul>
          {urgencyLine ? <p className="overview-muted">{urgencyLine}</p> : null}
          {insights?.recommendations?.length ? (
            <InsightRecommendationStrip recommendations={insights.recommendations} maxItems={4} />
          ) : null}
        </section>
      </div>

      <div className="overview-actions">
        <Link className="nb-btn nb-btn--push" to="/app/voice/ingest">
          Voice capture
        </Link>
        <Link className="nb-btn nb-btn--secondary" to="/app/voice/intelligence/features">
          Feature extraction
        </Link>
        <Link className="nb-btn nb-btn--secondary" to="/app/voice/decision/recommendations">
          Recommendations
        </Link>
      </div>
    </div>
  )
}
