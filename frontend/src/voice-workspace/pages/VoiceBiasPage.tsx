import { INSIGHTS_MAX_ROWS } from '../../data-workspace/constants'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'

export default function VoiceBiasPage() {
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
          <h2 className="nb-panel-card__title">Bias and correlation</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Bias and correlation</h2>
        <p className="mode-hint">
          Text-window bias metrics on transcripts (max {INSIGHTS_MAX_ROWS}). Tone vs sentiment correlation
          charts require structured speaker and rating fields not yet returned from voice.
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

            <h3 className="nb-section-heading">Tone vs sentiment and speaker patterns</h3>
            <p className="insights-subnote">
              Compare LLM emotion labels from capture with TextBlob polarity above manually for now.
              Automated speaker diarization and per-speaker emotion matrices are planned for a future API
              release.
            </p>
            <div className="nb-card nb-panel-card" style={{ marginTop: 'var(--space-3)' }}>
              <p className="empty-state">No speaker-level correlation endpoint configured.</p>
            </div>
          </div>
        ) : (
          <p className="empty-state">Run insights to load bias metrics.</p>
        )}
      </section>
    </div>
  )
}
