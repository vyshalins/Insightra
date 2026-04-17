import { FakeRiskDashboard } from '../../components/FakeRiskDashboard'
import { FAKE_ANALYZE_MAX_ROWS } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'
import { EmptyDatasetCta } from '../EmptyDatasetCta'

export default function DataFakePage() {
  const {
    result,
    filteredAndSortedRecords,
    fakeLoading,
    fakeError,
    fakeResults,
    handleAnalyzeFakes,
  } = useDataWorkspace()

  const truncated = filteredAndSortedRecords.length > FAKE_ANALYZE_MAX_ROWS
  const batch = filteredAndSortedRecords.slice(0, FAKE_ANALYZE_MAX_ROWS)

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
      <FakeRiskDashboard
        title="Fake Review Detection"
        hint={
          <>
            Hybrid scoring (rules, optional ML, optional similarity). Results apply to filtered rows (max{' '}
            {FAKE_ANALYZE_MAX_ROWS} per request). Triage labels use a client-side suspicious band for
            demo clarity.
          </>
        }
        analyzeLabel="Run fake detection"
        reviews={batch}
        results={fakeResults}
        loading={fakeLoading}
        error={fakeError}
        onAnalyze={() => void handleAnalyzeFakes()}
        maxRows={FAKE_ANALYZE_MAX_ROWS}
        truncatedBatch={truncated}
      />
    </div>
  )
}
