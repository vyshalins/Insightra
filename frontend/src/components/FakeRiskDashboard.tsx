import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { FakeReviewResult, ReviewRecord } from '../api'
import { FakeConfidenceHistogram } from '../data-workspace/FakeConfidenceHistogram'
import { FakeRiskTimelineChart } from '../data-workspace/FakeRiskTimelineChart'
import { FakeTriageDistributionChart } from '../data-workspace/FakeTriageDistributionChart'
import {
  binConfidence,
  buildAlerts,
  campaignHeuristic,
  computeFakeSummary,
  computeRiskTier,
  mergeResultsWithReviews,
  seriesRiskOverTime,
  triageCounts,
  type TriageLabel,
} from '../data-workspace/fakeDashboardModel'

export type FakeRiskDashboardProps = {
  title: string
  hint: ReactNode
  analyzeLabel: string
  reviews: ReviewRecord[]
  results: FakeReviewResult[] | null
  loading: boolean
  error: string | null
  onAnalyze: () => void
  maxRows: number
  truncatedBatch: boolean
}

function triageDisplay(t: TriageLabel): string {
  if (t === 'likely_fake') return 'Likely fake'
  if (t === 'suspicious') return 'Suspicious'
  return 'Likely real'
}

function tierTitle(tier: ReturnType<typeof computeRiskTier>): string {
  if (tier === 'high') return 'HIGH'
  if (tier === 'medium') return 'MEDIUM'
  return 'LOW'
}

function truncate(s: string, n: number): string {
  const t = s.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n - 1)}…`
}

export function FakeRiskDashboard({
  title,
  hint,
  analyzeLabel,
  reviews,
  results,
  loading,
  error,
  onAnalyze,
  maxRows,
  truncatedBatch,
}: FakeRiskDashboardProps) {
  const [filter, setFilter] = useState<'all' | TriageLabel>('all')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const merged = useMemo(() => {
    if (!results?.length) return []
    return mergeResultsWithReviews(reviews, results)
  }, [reviews, results])

  const summary = useMemo(() => (results?.length ? computeFakeSummary(results) : null), [results])
  const tier = useMemo(() => (results?.length ? computeRiskTier(results) : 'low'), [results])
  const counts = useMemo(() => (results?.length ? triageCounts(results) : { likelyReal: 0, suspicious: 0, likelyFake: 0 }), [results])
  const bins = useMemo(() => (results?.length ? binConfidence(results) : []), [results])
  const timeline = useMemo(() => seriesRiskOverTime(merged), [merged])
  const alerts = useMemo(() => buildAlerts(merged), [merged])
  const campaign = useMemo(() => campaignHeuristic(merged), [merged])

  const filteredRows = useMemo(() => {
    if (filter === 'all') return merged
    return merged.filter((m) => m.triage === filter)
  }, [merged, filter])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="nb-card nb-panel-card fake-dashboard">
      <h2 className="nb-panel-card__title">{title}</h2>
      <p className="mode-hint">{hint}</p>

      <div className="fake-detect-panel">
        <div className="fake-detect-actions fake-dashboard__actions">
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => void onAnalyze()}
            disabled={loading || reviews.length === 0}
            aria-busy={loading}
          >
            {loading ? 'Analyzing…' : analyzeLabel}
          </button>
          <p className="fake-dashboard__server-note">
            ML and similarity layers follow server env (<code>FAKE_DETECT_ENABLE_ML</code>,{' '}
            <code>FAKE_DETECT_ENABLE_SBERT</code>); there is no per-request &quot;deep scan&quot; toggle yet.
          </p>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      {summary ? (
        <>
          <div className="fake-dashboard__summary-row" role="status">
            <article className="fake-summary-card">
              <h3 className="fake-summary-card__label">Fake review risk</h3>
              <p className={`fake-risk-pill fake-risk-pill--${tier}`}>{tierTitle(tier)}</p>
              <p className="fake-summary-card__sub">
                {tier === 'low'
                  ? 'No strong coordinated risk in this batch.'
                  : tier === 'medium'
                    ? 'Elevated risk — review flagged rows and alerts.'
                    : 'Serious risk — prioritize manual review.'}
              </p>
            </article>
            <article className="fake-summary-card">
              <h3 className="fake-summary-card__label">Analyzed</h3>
              <p className="fake-summary-card__value">{summary.analyzed}</p>
              <p className="fake-summary-card__sub">reviews in this run</p>
            </article>
            <article className="fake-summary-card">
              <h3 className="fake-summary-card__label">Flagged fake</h3>
              <p className="fake-summary-card__value">{summary.fakes}</p>
              <p className="fake-summary-card__sub">above server threshold</p>
            </article>
            <article className="fake-summary-card">
              <h3 className="fake-summary-card__label">Suspicious</h3>
              <p className="fake-summary-card__value">{summary.suspicious}</p>
              <p className="fake-summary-card__sub">mid-band risk scores</p>
            </article>
            <article className="fake-summary-card">
              <h3 className="fake-summary-card__label">Avg risk score</h3>
              <p className="fake-summary-card__value">{(summary.avgRisk * 100).toFixed(1)}%</p>
              <p className="fake-summary-card__sub">mean fused confidence</p>
            </article>
          </div>
          {truncatedBatch ? (
            <p className="fake-detect-truncate" role="note">
              Only first {maxRows} rows sent to the API.
            </p>
          ) : null}

          <div className="fake-dashboard__pipeline" aria-hidden="true">
            <span className="fake-dashboard__pipeline-step">Input</span>
            <span className="fake-dashboard__pipeline-arrow">→</span>
            <span className="fake-dashboard__pipeline-step">Rules</span>
            <span className="fake-dashboard__pipeline-arrow">→</span>
            <span className="fake-dashboard__pipeline-step">ML</span>
            <span className="fake-dashboard__pipeline-arrow">→</span>
            <span className="fake-dashboard__pipeline-step">Similarity</span>
            <span className="fake-dashboard__pipeline-arrow">→</span>
            <span className="fake-dashboard__pipeline-step">Fused score</span>
          </div>
          <p className="insights-legend fake-dashboard__pipeline-note">
            ML and similarity steps run only when enabled on the server; the fused score is always returned.
          </p>

          <div className="fake-dashboard__grid">
            <div className="fake-dashboard__charts">
              <FakeTriageDistributionChart
                likelyReal={counts.likelyReal}
                suspicious={counts.suspicious}
                likelyFake={counts.likelyFake}
              />
              <FakeConfidenceHistogram bins={bins} />
              <FakeRiskTimelineChart points={timeline} />
            </div>
            <div className="fake-dashboard__side">
              <aside className="fake-alerts-panel">
                <h3 className="fake-alerts-panel__title">Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="fake-alerts-panel__ok">No anomalies surfaced from signal heuristics.</p>
                ) : (
                  <ul className="fake-alerts-panel__list">
                    {alerts.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </aside>
              <aside className={`fake-campaign-card ${campaign.detected ? 'fake-campaign-card--alert' : ''}`}>
                <h3 className="fake-campaign-card__title">Campaign detection</h3>
                <p className="fake-campaign-card__headline">{campaign.title}</p>
                <p className="fake-campaign-card__detail">{campaign.detail}</p>
              </aside>
            </div>
          </div>

          <div className="fake-dashboard__table-section">
            <h3 className="nb-section-heading">Review detail</h3>
            <div className="fake-dashboard__filters" role="group" aria-label="Filter by triage">
              {(['all', 'likely_fake', 'suspicious', 'likely_real'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`nb-btn fake-filter-btn ${filter === key ? 'fake-filter-btn--active' : 'nb-btn--secondary'}`}
                  onClick={() => setFilter(key)}
                >
                  {key === 'all'
                    ? 'All'
                    : key === 'likely_fake'
                      ? 'Fake'
                      : key === 'suspicious'
                        ? 'Suspicious'
                        : 'Real'}
                </button>
              ))}
            </div>
            <div className="table-wrap fake-table-wrap">
              <table className="fake-table">
                <thead>
                  <tr>
                    <th aria-label="expand" />
                    <th>Review</th>
                    <th>Score</th>
                    <th>Label</th>
                    <th>Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No reviews match this filter.
                      </td>
                    </tr>
                  ) : null}
                  {filteredRows.map(({ review, result, triage }) => {
                    const open = expanded.has(review.review_id)
                    return (
                      <Fragment key={review.review_id}>
                        <tr className="fake-table__row">
                          <td>
                            <button
                              type="button"
                              className="fake-table__expand"
                              onClick={() => toggleExpand(review.review_id)}
                              aria-expanded={open}
                              aria-label={open ? 'Collapse detail' : 'Expand detail'}
                            >
                              {open ? '−' : '+'}
                            </button>
                          </td>
                          <td className="fake-table__text">{truncate(review.text, 140)}</td>
                          <td>{(result.fake_confidence * 100).toFixed(1)}%</td>
                          <td>
                            <span className={`fake-triage-pill fake-triage-pill--${triage}`}>
                              {triageDisplay(triage)}
                            </span>
                          </td>
                          <td className="fake-table__signals">
                            {[...result.fake_signals, result.similarity_neighbor ? 'similarity_neighbor' : '']
                              .filter(Boolean)
                              .slice(0, 4)
                              .join(', ') || '—'}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="fake-table__detail-row">
                            <td colSpan={5}>
                              <div className="fake-table__detail">
                                <p>
                                  <strong>Explanation:</strong> {result.explanation || '—'}
                                </p>
                                <p>
                                  <strong>Rule score:</strong> {(result.rule_score * 100).toFixed(1)}% ·{' '}
                                  <strong>ML prob:</strong>{' '}
                                  {result.ml_fake_prob != null ? `${(result.ml_fake_prob * 100).toFixed(1)}%` : 'n/a'}
                                </p>
                                <p>
                                  <strong>Signals:</strong> {result.fake_signals.join(', ') || '—'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="empty-state" role="status">
          {loading ? 'Running analysis…' : 'Run detection to load the decision dashboard.'}
        </p>
      )}
    </section>
  )
}
