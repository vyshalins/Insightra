import { useMemo } from 'react'
import { BiasSentimentMeters } from '../../components/BiasSentimentMeters'
import { CorrelationRoadmapCard } from '../../components/CorrelationRoadmapCard'
import { InsightKeyCallout } from '../../components/InsightKeyCallout'
import { InsightRecommendationStrip } from '../../components/InsightRecommendationStrip'
import { biasNarrative } from '../../components/insightNarratives'
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

  const biasN = useMemo(() => (insights ? biasNarrative(insights.bias) : null), [insights])

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
          Shrinkage-adjusted sentiment for the current window. Run insights on the current filter (max{' '}
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
        {insights && biasN ? (
          <div className="insights-body" aria-live="polite">
            <InsightKeyCallout title="Sentiment reality check" body={biasN.body} severity="info" />
            <div className="summary-grid insights-summary-grid">
              <article className="summary-card">
                <h3>Raw window</h3>
                <p className="summary-card__tone">{biasN.rawTone}</p>
                <p className="insights-subnote">Polarity {insights.bias.raw_sentiment.toFixed(3)} (−1 to +1)</p>
              </article>
              <article className="summary-card">
                <h3>Adjusted window</h3>
                <p className="summary-card__tone">{biasN.adjTone}</p>
                <p className="insights-subnote">
                  Polarity {insights.bias.adjusted_sentiment.toFixed(3)} — shrinkage toward neutral
                </p>
              </article>
              <article className="summary-card">
                <h3>Volume weight</h3>
                <p>{(insights.bias.volume_weight * 100).toFixed(0)}%</p>
                <p className="insights-subnote">Reliability from sample size in the current window</p>
              </article>
            </div>

            <h3 className="nb-section-heading">Sentiment on a scale</h3>
            <p className="insights-legend">
              Bars show where the mean sits between negative and positive; the black tick is the exact score.
            </p>
            <BiasSentimentMeters
              rawSentiment={insights.bias.raw_sentiment}
              adjustedSentiment={insights.bias.adjusted_sentiment}
            />

            <h3 className="nb-section-heading">Structured correlations</h3>
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
