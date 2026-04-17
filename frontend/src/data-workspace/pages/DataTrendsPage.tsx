import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import { isCriticalTrendRow, topTrendHeadline } from '../../components/insightNarratives'
import { TrendTopMoversChart } from '../../components/TrendTopMoversChart'
import { INSIGHTS_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataTrendsPage() {
  const {
    result,
    filteredAndSortedRecords,
    insights,
    insightsLoading,
    insightsError,
    insightsHasZScore,
    handleAnalyzeInsights,
  } = useDataWorkspace()

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Trend Detection</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Trend Detection</h2>
        <p className="mode-hint">
          Compares the latest window of reviews vs the prior window (lexicon themes, sentiment). Uses
          filtered rows (max {INSIGHTS_MAX_ROWS} per request).
        </p>
        <div className="insights-actions">
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => void handleAnalyzeInsights()}
            disabled={insightsLoading || filteredAndSortedRecords.length === 0}
            aria-busy={insightsLoading}
          >
            {insightsLoading ? 'Computing…' : 'Run insights'}
          </button>
        </div>
        {insightsError ? <p className="error-text">{insightsError}</p> : null}
        {insights ? (
          <div className="insights-body" aria-live="polite">
            {(() => {
              const h = topTrendHeadline(insights.trends)
              return h ? <InsightKeyCallout body={h.body} severity={h.severity} /> : null
            })()}
            <div className="summary-grid insights-summary-grid">
              <article className="summary-card insights-card-urgency">
                <h3>Urgency</h3>
                <p className="insights-urgency-line">
                  <span className="insights-urgency-score">{insights.urgency_score.toFixed(1)}</span>
                  <span className={`insights-urgency-pill insights-urgency-pill--${insights.urgency_level}`}>
                    {insights.urgency_level === 'high'
                      ? 'Immediate attention'
                      : insights.urgency_level === 'medium'
                        ? 'Monitor'
                        : 'Low priority'}
                  </span>
                </p>
                <p className="insights-legend">
                  Score over 80 suggests immediate ops review; 50–80 monitor; under 50 typically safe to
                  backlog.
                </p>
              </article>
            </div>
            <p className="insights-meta">
              Windows: prev {insights.meta.previous_window_size} · current {insights.meta.current_window_size}{' '}
              · anomaly: {insights.meta.anomaly_mode}
              {insights.meta.notes ? ` · ${insights.meta.notes}` : ''}
            </p>
            <TrendTopMoversChart trends={insights.trends} />
            <h4 className="insights-subheading">Feature trend table</h4>
            <p className="insights-legend">
              Classification uses change in mention rate (percentage points): under 5% noise, 5–20%
              emerging, over 20% systemic.
            </p>
            <div className="table-wrap insights-table-wrap">
              <table className="insights-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Prev</th>
                    <th>Now</th>
                    <th>Delta</th>
                    <th>Trend</th>
                    <th>Severity</th>
                    {insightsHasZScore ? <th>Z / score</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {[...insights.trends]
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .slice(0, 8)
                    .map((t) => {
                      const clf = t.classification
                      const chipClass =
                        clf === 'systemic'
                          ? 'insights-chip insights-chip--systemic'
                          : clf === 'emerging'
                            ? 'insights-chip insights-chip--emerging'
                            : 'insights-chip insights-chip--noise'
                      const critical = isCriticalTrendRow(t)
                      return (
                        <tr
                          key={t.feature}
                          className={critical ? 'insights-table__row--critical' : undefined}
                        >
                          <td>
                            {critical ? <strong>{t.feature}</strong> : t.feature}
                          </td>
                          <td>{(t.prev_rate * 100).toFixed(1)}%</td>
                          <td>{(t.current_rate * 100).toFixed(1)}%</td>
                          <td>{(t.delta * 100).toFixed(1)} pp</td>
                          <td>
                            <span className={`insights-trend insights-trend--${t.trend}`}>{t.trend}</span>
                          </td>
                          <td>
                            <span className={chipClass}>{clf}</span>
                          </td>
                          {insightsHasZScore ? (
                            <td>{t.z_score != null ? t.z_score.toFixed(2) : '—'}</td>
                          ) : null}
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {insights.urgency_items.length > 0 ? (
              <>
                <h4 className="insights-subheading">Urgency by feature</h4>
                <ul className="insights-urgency-list">
                  {insights.urgency_items.map((u) => (
                    <li key={u.feature}>
                      <span className={`insights-urgency-pill insights-urgency-pill--${u.urgency}`}>
                        {u.urgency}
                      </span>{' '}
                      <strong>{u.feature}</strong> (score {u.score.toFixed(0)}): {u.action}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <InsightRecommendationStrip recommendations={insights.recommendations} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
