import type { AspectSentimentFeature, InsightsResponse } from '../api'

function sentimentPillClass(label: string): string {
  const l = label.toLowerCase()
  if (l === 'positive') return 'aspect-sentiment-pill aspect-sentiment-pill--positive'
  if (l === 'negative') return 'aspect-sentiment-pill aspect-sentiment-pill--negative'
  return 'aspect-sentiment-pill aspect-sentiment-pill--neutral'
}

function formatConfidence(c: number | null | undefined): string {
  if (c == null || Number.isNaN(c)) return '—'
  return c.toFixed(2)
}

function AspectSentimentTable({
  heading,
  rows,
}: {
  heading: string
  rows: AspectSentimentFeature[]
}) {
  return (
    <>
      <h4 className="insights-subheading">{heading}</h4>
      {rows.length === 0 ? (
        <p className="empty-state">No lexicon feature hits in this window.</p>
      ) : (
        <div className="table-wrap insights-table-wrap">
          <table className="insights-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Sentiment</th>
                <th>Mean polarity</th>
                <th>Confidence</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    <span className={sentimentPillClass(row.sentiment_label)}>{row.sentiment_label}</span>
                  </td>
                  <td>{row.mean_polarity.toFixed(3)}</td>
                  <td>{formatConfidence(row.confidence)}</td>
                  <td>{row.sample_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

type Props = {
  insights: InsightsResponse
}

export function AspectSentimentInsightsBody({ insights }: Props) {
  const abs = insights.aspect_sentiment
  const emptyBoth = abs.current.length === 0 && abs.previous.length === 0

  return (
    <div className="insights-body" aria-live="polite">
      <p className="insights-meta">
        Windows: prev {insights.meta.previous_window_size} · current {insights.meta.current_window_size} ·
        total input {insights.meta.total_input_reviews}
        {insights.meta.notes ? ` · ${insights.meta.notes}` : ''}
      </p>
      <p className="insights-meta aspect-sentiment-meta">
        {abs.groq_refined ? (
          <span className="insights-chip insights-chip--systemic">Groq refinement on</span>
        ) : (
          <span className="insights-chip insights-chip--noise">Lexicon + TextBlob only</span>
        )}
        {abs.excluded_ambiguous_count > 0 ? (
          <span className="aspect-sentiment-meta__gap">
            Skipped {abs.excluded_ambiguous_count} ambiguous review(s) for ABSA
          </span>
        ) : null}
      </p>
      <p className="insights-legend">
        Sentiment is averaged over sentence-level hits where a lexicon theme matches (same buckets as trend
        detection). Polarity is TextBlob on each matching sentence; optional Groq refines the current window
        when enabled on the server.
      </p>
      {emptyBoth ? (
        <p className="empty-state">
          No aspect rows in either window. Try reviews that mention packaging, delivery, quality, battery,
          price, or service.
        </p>
      ) : null}
      <AspectSentimentTable heading="Current window" rows={abs.current} />
      <AspectSentimentTable heading="Previous window" rows={abs.previous} />
    </div>
  )
}
