import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'
import { voiceFakeCells } from '../voiceTableCells'

function formatTs(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export default function VoiceExploreFullPage() {
  const { sessions, fakeByReviewId } = useVoiceWorkspace()

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Full dataset view (transcripts)</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Full dataset view (transcripts)</h2>
        <p className="mode-hint">All voice runs in this browser session, newest first.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>File</th>
                <th>Analyzed</th>
                <th>Transcript</th>
                <th>Emotion</th>
                <th>Fake verdict</th>
                <th>Risk %</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => (
                <tr key={row.id}>
                  <td>{row.id.slice(0, 8)}…</td>
                  <td>{row.fileName}</td>
                  <td>{formatTs(row.analyzedAt)}</td>
                  <td>{row.transcript || '—'}</td>
                  <td>
                    <span className="data-chip">{row.emotion}</span>
                  </td>
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
