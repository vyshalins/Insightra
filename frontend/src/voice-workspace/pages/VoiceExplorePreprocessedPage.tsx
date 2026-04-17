import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { voiceFakeCells } from '../voiceTableCells'

export default function VoiceExplorePreprocessedPage() {
  const { sessions, fakeByReviewId } = useVoiceWorkspace()

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Preprocessed and cleaned</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Preprocessed and cleaned</h2>
        <p className="mode-hint">
          Transcripts trimmed for display; structured fields from the voice pipeline (emotion, issues,
          actions).
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Cleaned transcript</th>
                <th>Emotion</th>
                <th>Issues</th>
                <th>Actions</th>
                <th>Fake verdict</th>
                <th>Risk %</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => (
                <tr key={row.id}>
                  <td>{row.fileName}</td>
                  <td>{(row.transcript || '').trim() || '—'}</td>
                  <td>
                    <span className="data-chip">{row.emotion}</span>
                  </td>
                  <td>{row.issues.length ? row.issues.join('; ') : '—'}</td>
                  <td>{row.actions.length ? row.actions.join('; ') : '—'}</td>
                  {voiceFakeCells(row, fakeByReviewId)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
