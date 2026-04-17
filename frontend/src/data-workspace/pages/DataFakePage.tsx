import { useMemo } from 'react'
import { FAKE_ANALYZE_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'
import { FakeDistributionChart } from '../FakeDistributionChart'

export default function DataFakePage() {
  const {
    result,
    filteredAndSortedRecords,
    fakeLoading,
    fakeError,
    fakeSummary,
    handleAnalyzeFakes,
    fakeResults,
  } = useDataWorkspace()

  const dist = useMemo(() => {
    if (!fakeResults?.length) {
      return { real: 0, fake: 0 }
    }
    const fake = fakeResults.filter((r) => r.is_fake).length
    return { real: fakeResults.length - fake, fake }
  }, [fakeResults])

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Fake Review Detection</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Fake Review Detection</h2>
        <p className="mode-hint">
          Hybrid scoring (rules, optional ML, optional similarity). Results apply to filtered rows (max{' '}
          {FAKE_ANALYZE_MAX_ROWS} per request).
        </p>
        <div className="fake-detect-panel">
          <div className="fake-detect-actions">
            <button
              type="button"
              className="nb-btn nb-btn--secondary"
              onClick={() => void handleAnalyzeFakes()}
              disabled={fakeLoading || filteredAndSortedRecords.length === 0}
              aria-busy={fakeLoading}
            >
              {fakeLoading ? 'Analyzing…' : 'Run fake detection'}
            </button>
            {fakeSummary ? (
              <p className="fake-detect-summary" role="status">
                Analyzed {fakeSummary.analyzed}: {fakeSummary.fakes} flagged likely fake · avg risk score{' '}
                {(fakeSummary.avgRisk * 100).toFixed(1)}%
                {filteredAndSortedRecords.length > FAKE_ANALYZE_MAX_ROWS ? (
                  <span className="fake-detect-truncate">
                    {' '}
                    (only first {FAKE_ANALYZE_MAX_ROWS} filtered rows sent)
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          {fakeError ? <p className="error-text">{fakeError}</p> : null}
        </div>

        <div className="charts-grid" style={{ marginTop: 'var(--space-3)' }}>
          <FakeDistributionChart likelyReal={dist.real} likelyFake={dist.fake} />
        </div>
      </section>
    </div>
  )
}
