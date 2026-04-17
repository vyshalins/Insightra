import { lazy, Suspense } from 'react'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { ChartsSkeleton } from '../ChartsSkeleton'
import { DatasetToolbar } from '../DatasetToolbar'
import { EmptyDatasetCta } from '../EmptyDatasetCta'
import { formatTimestamp, getRecordLanguage } from '../utils'

const DataInputCharts = lazy(() => import('../../components/DataInputCharts'))

export default function DataExplorePreprocessedPage() {
  const { result, metrics, previewRecords, renderFakeCells } = useDataWorkspace()

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Preprocessed and Cleaned Data</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Preprocessed and Cleaned Data</h2>
        <p className="mode-hint">
          Cleaned, normalized text ready for modeling—language detection, translation flags, and quality
          signals for the current filter.
        </p>
        <DatasetToolbar />

        <h3 className="nb-section-heading">Preprocessing Analytics</h3>
        <div className="summary-grid analytics-summary-grid">
          <article className="summary-card">
            <h3>Total Displayed</h3>
            <p>{metrics.total}</p>
          </article>
          <article className="summary-card">
            <h3>Unique Languages</h3>
            <p>{metrics.uniqueLanguages}</p>
          </article>
          <article className="summary-card">
            <h3>Translated</h3>
            <p>
              {metrics.translatedCount} ({metrics.translatedPct.toFixed(1)}%)
            </p>
          </article>
          <article className="summary-card">
            <h3>Avg Cleaned Length</h3>
            <p>{metrics.avgCleanedLength.toFixed(1)}</p>
          </article>
          <article className="summary-card">
            <h3>Avg Original Length</h3>
            <p>{metrics.avgOriginalLength.toFixed(1)}</p>
          </article>
          <article className="summary-card">
            <h3>Compression Ratio</h3>
            <p>{metrics.compressionRatio.toFixed(2)}</p>
          </article>
        </div>

        <Suspense fallback={<ChartsSkeleton />}>
          <DataInputCharts
            languageChartData={metrics.languageChartData}
            translationChartData={metrics.translationChartData}
            qualityChartData={metrics.qualityChartData}
            topTokenData={metrics.topTokenData}
          />
        </Suspense>

        <h3 className="nb-section-heading">Preview (First 20 records)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Text</th>
                <th>Source</th>
                <th>Timestamp</th>
                <th>Product ID</th>
                <th>Original Text</th>
                <th>Language</th>
                <th>Translated</th>
                <th>Fake verdict</th>
                <th>Risk %</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {previewRecords.length === 0 ? (
                <tr>
                  <td colSpan={11}>No records match current filter.</td>
                </tr>
              ) : (
                previewRecords.map((record) => (
                  <tr key={`preview-${record.review_id}-${record.timestamp}`}>
                    <td>{record.review_id}</td>
                    <td>{record.text}</td>
                    <td>{record.source}</td>
                    <td>{formatTimestamp(record.timestamp)}</td>
                    <td>{record.product_id}</td>
                    <td>{record.original_text || '—'}</td>
                    <td>
                      <span className="data-chip">{getRecordLanguage(record)}</span>
                    </td>
                    <td>
                      <span className={`data-chip ${record.translated ? 'chip-yes' : 'chip-no'}`}>
                        {record.translated ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {renderFakeCells(record)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
