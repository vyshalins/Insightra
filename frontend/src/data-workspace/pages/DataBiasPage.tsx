import { INSIGHTS_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataBiasPage() {
  const {
    result,
    filteredAndSortedRecords,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeInsights,
  } = useDataWorkspace()

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Bias and Correlation Analysis</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Bias and Correlation Analysis</h2>
        <p className="mode-hint">
          Bias-adjusted sentiment from the insights engine. Run insights on the current filter (max{' '}
          {INSIGHTS_MAX_ROWS} rows).
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
            <div className="summary-grid insights-summary-grid">
              <article className="summary-card">
                <h3>Raw sentiment</h3>
                <p>{insights.bias.raw_sentiment.toFixed(3)}</p>
                <p className="insights-subnote">Mean TextBlob polarity (current window)</p>
              </article>
              <article className="summary-card">
                <h3>Adjusted sentiment</h3>
                <p>{insights.bias.adjusted_sentiment.toFixed(3)}</p>
                <p className="insights-subnote">
                  Shrinkage toward neutral (bias correction); Δ{' '}
                  {(insights.bias.adjusted_sentiment - insights.bias.raw_sentiment).toFixed(3)}
                </p>
              </article>
              <article className="summary-card">
                <h3>Volume weight</h3>
                <p>{(insights.bias.volume_weight * 100).toFixed(0)}%</p>
                <p className="insights-subnote">Confidence from sample size</p>
              </article>
            </div>

            <h3 className="nb-section-heading">Correlation analysis</h3>
            <p className="insights-subnote">
              Structured correlations (e.g. rating vs sentiment, language vs sentiment) are not yet
              exposed by the API. This placeholder reserves space for future charts when review ratings are
              ingested.
            </p>
            <div className="nb-card nb-panel-card" style={{ marginTop: 'var(--space-3)' }}>
              <p className="empty-state">No correlation endpoints configured.</p>
            </div>
          </div>
        ) : (
          <p className="empty-state">Run insights to load bias metrics.</p>
        )}
      </section>
    </div>
  )
}
