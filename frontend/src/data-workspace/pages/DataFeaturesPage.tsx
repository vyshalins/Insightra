import { useMemo } from 'react'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import {
  aspectPolarityBarWidth,
  featurePageInsightLine,
  languageNarrative,
} from '../../components/insightNarratives'
import { INSIGHTS_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataFeaturesPage() {
  const {
    result,
    metrics,
    filteredAndSortedRecords,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeInsights,
  } = useDataWorkspace()

  const productMix = useMemo(() => {
    const m = new Map<string, number>()
    filteredAndSortedRecords.forEach((r) => {
      const p = (r.product_id || 'unknown').trim() || 'unknown'
      m.set(p, (m.get(p) ?? 0) + 1)
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [filteredAndSortedRecords])

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Feature extraction</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  const insightLine = insights ? featurePageInsightLine(insights) : null

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Feature extraction</h2>
        <p className="mode-hint">
          Product themes and language mix from the insights engine (lexicon + sentence sentiment). Raw token
          counts stay available as an appendix. Max {INSIGHTS_MAX_ROWS} filtered rows per insights run.
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

        {insights && insightLine ? (
          <>
            <InsightKeyCallout body={insightLine.body} severity={insightLine.severity} />
            <h3 className="nb-section-heading">Product themes (current window)</h3>
            <p className="insights-legend">
              From aspect sentiment: polarity per lexicon bucket in the latest insights window (not simple
              word frequency).
            </p>
            {insights.aspect_sentiment.current.length === 0 ? (
              <p className="empty-state">No theme hits in the current window. Try reviews that mention delivery, packaging, quality, battery, price, or service.</p>
            ) : (
              <div className="feature-aspect-grid">
                {insights.aspect_sentiment.current.map((row) => {
                  const w = aspectPolarityBarWidth(row)
                  const fillMod =
                    row.sentiment_label === 'negative'
                      ? 'feature-aspect-card__bar-fill--neg'
                      : row.sentiment_label === 'positive'
                        ? 'feature-aspect-card__bar-fill--pos'
                        : ''
                  return (
                    <article key={row.feature} className="feature-aspect-card">
                      <h4 className="feature-aspect-card__title">{row.feature}</h4>
                      <p className="feature-aspect-card__meta">
                        {row.sentiment_label} · polarity {row.mean_polarity.toFixed(2)} · {row.sample_count}{' '}
                        sentence hit(s)
                      </p>
                      <div className="feature-aspect-card__bar">
                        <div
                          className={`feature-aspect-card__bar-fill ${fillMod}`}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
            <InsightRecommendationStrip recommendations={insights.recommendations} />
          </>
        ) : (
          <p className="empty-state">Run insights to load theme cards and recommendations.</p>
        )}

        <h3 className="nb-section-heading">Language insights</h3>
        <p className="insights-subnote">{languageNarrative(metrics.languageChartData)}</p>
        <ul className="insights-rec-list">
          {metrics.languageChartData.map((row) => (
            <li key={row.name}>
              <strong>{row.name}</strong> — {row.value} reviews
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Product ID mix</h3>
        <ul className="insights-rec-list">
          {productMix.map(([pid, n]) => (
            <li key={pid}>
              <strong>{pid}</strong> — {n}
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Metadata coverage</h3>
        <p className="insights-subnote">
          Translated share: {metrics.translatedPct.toFixed(1)}% · Unique languages: {metrics.uniqueLanguages}{' '}
          · Rows in view: {metrics.total}
        </p>

        <details className="insight-token-appendix" style={{ marginTop: 'var(--space-3)' }}>
          <summary className="nb-section-heading" style={{ cursor: 'pointer' }}>
            Raw token appendix (optional)
          </summary>
          <p className="insights-legend">
            Frequent tokens from cleaned text — useful for QA, not for executive summaries.
          </p>
          <ul className="insights-rec-list">
            {metrics.topTokenData.length === 0 ? (
              <li>No token counts for the current filter.</li>
            ) : (
              metrics.topTokenData.map((row) => (
                <li key={row.token}>
                  <strong>{row.token}</strong> — {row.count} mentions
                </li>
              ))
            )}
          </ul>
        </details>
      </section>
    </div>
  )
}
