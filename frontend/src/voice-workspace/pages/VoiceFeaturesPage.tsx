import { useMemo } from 'react'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import {
  aspectPolarityBarWidth,
  featurePageInsightLine,
} from '../../components/insightNarratives'
import { INSIGHTS_MAX_ROWS } from '../../data-workspace/constants'
import { tokenize } from '../../data-workspace/utils'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'

export default function VoiceFeaturesPage() {
  const {
    sessions,
    reviewRecords,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeInsights,
  } = useVoiceWorkspace()

  const { topTokens, emotionMix, intentHints } = useMemo(() => {
    const freq = new Map<string, number>()
    const emotions = new Map<string, number>()
    const intents = new Set<string>()
    sessions.forEach((s) => {
      emotions.set(s.emotion, (emotions.get(s.emotion) ?? 0) + 1)
      tokenize(s.transcript).forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1))
      s.issues.forEach((i) => intents.add(i))
      s.actions.forEach((a) => intents.add(a))
    })
    const topTokens = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    const emotionMix = [...emotions.entries()].sort((a, b) => b[1] - a[1])
    return {
      topTokens,
      emotionMix,
      intentHints: [...intents].slice(0, 20),
    }
  }, [sessions])

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Feature extraction</h2>
          <EmptyVoiceCta />
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
          Themes from insights on transcript rows (max {INSIGHTS_MAX_ROWS}), plus capture-time emotion and
          keyword appendix.
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

        {insights && insightLine ? (
          <>
            <InsightKeyCallout body={insightLine.body} severity={insightLine.severity} />
            <div className="voice-features-split">
              <div>
                <h3 className="nb-section-heading">Product themes (current window)</h3>
                {insights.aspect_sentiment.current.length === 0 ? (
                  <p className="empty-state">No lexicon theme hits on these transcripts.</p>
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
                            {row.sentiment_label} · polarity {row.mean_polarity.toFixed(2)} · hits{' '}
                            {row.sample_count}
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
              </div>
              <div>
                <h3 className="nb-section-heading">Emotion mix (capture)</h3>
                <ul className="insights-rec-list">
                  {emotionMix.map(([label, n]) => (
                    <li key={label}>
                      <strong>{label || 'Unknown'}</strong> — {n} clip(s)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <InsightRecommendationStrip recommendations={insights.recommendations} />
          </>
        ) : (
          <p className="empty-state">Run insights to load theme cards and recommendations.</p>
        )}

        <details className="insight-token-appendix" style={{ marginTop: 'var(--space-3)' }}>
          <summary className="nb-section-heading" style={{ cursor: 'pointer' }}>
            Keywords from transcripts (appendix)
          </summary>
          <ul className="insights-rec-list">
            {topTokens.map(([word, n]) => (
              <li key={word}>
                <strong>{word}</strong> — {n}
              </li>
            ))}
          </ul>
        </details>

        <h3 className="nb-section-heading">Intent and actions (text signals)</h3>
        <ul className="insights-rec-list">
          {intentHints.length === 0 ? (
            <li>No issues or actions yet.</li>
          ) : (
            intentHints.map((line) => <li key={line}>{line}</li>)
          )}
        </ul>
      </section>
    </div>
  )
}
