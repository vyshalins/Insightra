import { INSIGHTS_MAX_ROWS } from '../../data-workspace/constants'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'

export default function VoiceRecommendationsPage() {
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
          <h2 className="nb-panel-card__title">Recommendation engine</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Recommendation engine</h2>
        <p className="mode-hint">
          Merge transcript-window recommendations with LLM action lines from each clip (max{' '}
          {INSIGHTS_MAX_ROWS} rows for insights).
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
            <h4 className="insights-subheading">Suggested business actions (insights)</h4>
            {insights.recommendations.length > 0 ? (
              <ul className="insights-rec-list">
                {insights.recommendations.map((line, i) => (
                  <li key={`rec-${i}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="insights-subnote">No recommendation lines returned.</p>
            )}
            <h4 className="insights-subheading">LLM actions from clips</h4>
            <ul className="insights-rec-list">
              {sessions.every((s) => s.actions.length === 0) ? (
                <li>No stored actions.</li>
              ) : (
                sessions.flatMap((s) =>
                  s.actions.map((a, i) => (
                    <li key={`${s.id}-a-${i}`}>
                      <strong>{s.fileName}</strong>: {a}
                    </li>
                  )),
                )
              )}
            </ul>
          </div>
        ) : (
          <p className="empty-state">Run insights to load recommendations.</p>
        )}
      </section>
    </div>
  )
}
