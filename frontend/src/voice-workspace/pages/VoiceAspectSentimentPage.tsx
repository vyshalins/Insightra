import { INSIGHTS_MAX_ROWS } from '../../data-workspace/constants'
import { AspectSentimentInsightsBody } from '../../components/AspectSentimentInsightsBody'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'

export default function VoiceAspectSentimentPage() {
  const {
    sessions,
    reviewRecords,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeInsights,
  } = useVoiceWorkspace()

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Aspect sentiment</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Aspect sentiment</h2>
        <p className="mode-hint">
          Per-feature polarity on transcript-derived rows (max {INSIGHTS_MAX_ROWS}). Add multiple clips for
          richer windows.
        </p>
        <div className="insights-actions">
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => void handleAnalyzeInsights()}
            disabled={insightsLoading || reviewRecords.length === 0}
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
