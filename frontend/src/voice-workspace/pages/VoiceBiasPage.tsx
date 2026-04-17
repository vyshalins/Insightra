import { useMemo } from 'react'
import { BiasSentimentMeters } from '../../components/BiasSentimentMeters'
import { CorrelationRoadmapCard } from '../../components/CorrelationRoadmapCard'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import { biasNarrative } from '../../components/insightNarratives'
import { INSIGHTS_MAX_ROWS } from '../../data-workspace/constants'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'

export default function VoiceBiasPage() {
  const {
    sessions,
    reviewRecords,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeInsights,
  } = useVoiceWorkspace()

  const biasN = useMemo(() => (insights ? biasNarrative(insights.bias) : null), [insights])

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
          Text-window bias metrics on transcripts (max {INSIGHTS_MAX_ROWS}). Compare shrinkage below with
          emotion labels from capture.
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
        {insights && biasN ? (
          <div className="insights-body" aria-live="polite">
            <InsightKeyCallout title="Sentiment reality check" body={biasN.body} severity="info" />
            <div className="summary-grid insights-summary-grid">
              <article className="summary-card">
                <h3>Raw window</h3>
                <p className="summary-card__tone">{biasN.rawTone}</p>
                <p className="insights-subnote">Polarity {insights.bias.raw_sentiment.toFixed(3)}</p>
              </article>
              <article className="summary-card">
                <h3>Adjusted window</h3>
                <p className="summary-card__tone">{biasN.adjTone}</p>
                <p className="insights-subnote">Polarity {insights.bias.adjusted_sentiment.toFixed(3)}</p>
              </article>
              <article className="summary-card">
                <h3>Volume weight</h3>
                <p>{(insights.bias.volume_weight * 100).toFixed(0)}%</p>
                <p className="insights-subnote">Reliability from sample size</p>
              </article>
            </div>

            <h3 className="nb-section-heading">Sentiment on a scale</h3>
            <BiasSentimentMeters
              rawSentiment={insights.bias.raw_sentiment}
              adjustedSentiment={insights.bias.adjusted_sentiment}
            />

            <h3 className="nb-section-heading">Speaker and rating correlations</h3>
            <p className="insights-subnote">
              Automated speaker diarization and per-speaker matrices are not in the API yet; use capture
              emotion labels alongside the meters above.
            </p>
            <CorrelationRoadmapCard />
            <InsightRecommendationStrip recommendations={insights.recommendations} />
          </div>
        ) : (
          <p className="empty-state">Run insights to load bias metrics.</p>
        )}
      </section>
    </div>
  )
}
