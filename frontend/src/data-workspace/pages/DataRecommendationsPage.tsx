import { INSIGHTS_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataRecommendationsPage() {
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
          <h2 className="nb-panel-card__title">Recommendation Engine</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Recommendation Engine</h2>
        <p className="mode-hint">
          Prioritized actions from the insights pipeline. Run insights on the current filter (max{' '}
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
            {insights.urgency_items.length > 0 ? (
              <>
                <h4 className="insights-subheading">Issue prioritization</h4>
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
            <h4 className="insights-subheading">Suggested business actions</h4>
            {insights.recommendations.length > 0 ? (
              <ul className="insights-rec-list">
                {insights.recommendations.map((line, i) => (
                  <li key={`rec-${i}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="insights-subnote">No recommendation lines returned.</p>
            )}
          </div>
        ) : (
          <p className="empty-state">Run insights to load recommendations.</p>
        )}
      </section>
    </div>
  )
}
