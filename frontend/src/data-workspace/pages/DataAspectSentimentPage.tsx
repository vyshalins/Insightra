import { INSIGHTS_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { AspectSentimentInsightsBody } from '../../components/AspectSentimentInsightsBody'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataAspectSentimentPage() {
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
          <h2 className="nb-panel-card__title">Aspect sentiment</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Aspect sentiment</h2>
        <p className="mode-hint">
          Per-feature polarity from sentence-level lexicon matches (insights API). Uses filtered rows (max{' '}
          {INSIGHTS_MAX_ROWS} per request).
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
          <AspectSentimentInsightsBody insights={insights} />
        ) : (
          <p className="empty-state">Run insights to load aspect sentiment tables.</p>
        )}
      </section>
    </div>
  )
}
