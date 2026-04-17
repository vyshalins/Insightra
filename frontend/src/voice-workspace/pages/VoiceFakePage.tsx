import { useMemo } from 'react'
import { FAKE_ANALYZE_MAX_ROWS } from '../../data-workspace/constants'
import { FakeDistributionChart } from '../../data-workspace/FakeDistributionChart'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'

export default function VoiceFakePage() {
  const {
    sessions,
    reviewRecords,
    fakeLoading,
    fakeError,
    fakeResults,
    handleAnalyzeFakes,
  } = useVoiceWorkspace()

  const dist = useMemo(() => {
    if (!fakeResults?.length) {
      return { real: 0, fake: 0 }
    }
    const fake = fakeResults.filter((r) => r.is_fake).length
    return { real: fakeResults.length - fake, fake }
  }, [fakeResults])

  const fakeSummary =
    fakeResults && fakeResults.length
      ? {
          analyzed: fakeResults.length,
          fakes: fakeResults.filter((r) => r.is_fake).length,
          avgRisk: fakeResults.reduce((a, r) => a + r.fake_confidence, 0) / fakeResults.length,
        }
      : null

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Fake and sentiment (text)</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Fake and sentiment (text)</h2>
        <p className="mode-hint">
          Runs the same hybrid fake scorer used for reviews on transcript text (max {FAKE_ANALYZE_MAX_ROWS}{' '}
          clips). Sentiment for voice is also surfaced as emotion labels on capture.
        </p>
        <div className="fake-detect-panel">
          <div className="fake-detect-actions">
            <button
              type="button"
              className="nb-btn nb-btn--secondary"
              onClick={() => void handleAnalyzeFakes()}
              disabled={fakeLoading || reviewRecords.length === 0}
              aria-busy={fakeLoading}
            >
              {fakeLoading ? 'Analyzing…' : 'Run classification'}
            </button>
            {fakeSummary ? (
              <p className="fake-detect-summary" role="status">
                Analyzed {fakeSummary.analyzed}: {fakeSummary.fakes} flagged likely fake · avg risk{' '}
                {(fakeSummary.avgRisk * 100).toFixed(1)}%
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
