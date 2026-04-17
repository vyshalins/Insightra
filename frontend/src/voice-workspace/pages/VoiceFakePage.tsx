import { FakeRiskDashboard } from '../../components/FakeRiskDashboard'
import { FAKE_ANALYZE_MAX_ROWS } from '../../data-workspace/constants'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'

export default function VoiceFakePage() {
  const { sessions, reviewRecords, fakeLoading, fakeError, fakeResults, handleAnalyzeFakes } =
    useVoiceWorkspace()

  const truncated = reviewRecords.length > FAKE_ANALYZE_MAX_ROWS
  const batch = reviewRecords.slice(0, FAKE_ANALYZE_MAX_ROWS)

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
      <FakeRiskDashboard
        title="Fake and sentiment (text)"
        hint={
          <>
            Same hybrid fake scorer as reviews, run on transcript text (max {FAKE_ANALYZE_MAX_ROWS} clips).
            Emotion labels stay on the voice capture flow.
          </>
        }
        analyzeLabel="Run classification"
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
