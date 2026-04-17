import { useMemo } from 'react'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'
export default function DataFeaturesPage() {
  const { result, metrics, filteredAndSortedRecords } = useDataWorkspace()

  const productMix = useMemo(() => {
    const m = new Map<string, number>()
    filteredAndSortedRecords.forEach((r) => {
      const p = (r.product_id || 'unknown').trim() || 'unknown'
      m.set(p, (m.get(p) ?? 0) + 1)
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [filteredAndSortedRecords])

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Feature Extraction</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Feature Extraction</h2>
        <p className="mode-hint">
          Lightweight signals derived from the current filtered dataset: frequent tokens, language mix,
          and product identifiers. Per-review sentiment scores are not returned by the API today.
        </p>

        <h3 className="nb-section-heading">Top keywords (cleaned text)</h3>
        <ul className="insights-rec-list">
          {metrics.topTokenData.length === 0 ? (
            <li>No token counts for the current filter.</li>
          ) : (
            metrics.topTokenData.map((row) => (
              <li key={row.token}>
                <strong>{row.token}</strong> — {row.count} mentions
              </li>
            ))
          )}
        </ul>

        <h3 className="nb-section-heading">Language distribution</h3>
        <ul className="insights-rec-list">
          {metrics.languageChartData.map((row) => (
            <li key={row.name}>
              <strong>{row.name}</strong> — {row.value} reviews
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Product ID mix</h3>
        <ul className="insights-rec-list">
          {productMix.map(([pid, n]) => (
            <li key={pid}>
              <strong>{pid}</strong> — {n}
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Metadata coverage</h3>
        <p className="insights-subnote">
          Translated share: {metrics.translatedPct.toFixed(1)}% · Unique languages: {metrics.uniqueLanguages}{' '}
          · Rows in view: {metrics.total}
        </p>
      </section>
    </div>
  )
}
